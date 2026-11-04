import type { ChannelId, ChatMessage } from '@/game/chat';
import type { Guild } from '@/game/guild';
import type { Check } from '@/game/character';
import type { GameBackend } from './backend';
import { PROTOCOL_VERSION, isPush, type HelloParams, type Me, type Method, type Methods, type Push, type Request, type ServerMessage, type UserInfo } from './protocol';

// Серверный бэкенд: `GameBackend` поверх WebSocket (протокол — `protocol.ts`, сервер — `server/`).
// Соединение ленивое: поднимается при первом вызове, падает — переподключается с нарастающей паузой,
// после переподключения заново здоровается (`auth.hello`). Запросы в это время ждут в очереди.
// Действия возвращают `Check` и не кидают исключений; чтение (`history`, `list`, `mine`) кидает Error
// с причиной, если сервер не ответил.

export type ConnectionStatus = 'offline' | 'connecting' | 'online';

export interface Identity {
  name: string;
  level?: number;
  rating?: number;
}

export interface ServerBackendOptions {
  /** ws://host:port или http(s)://host — схема подменится на ws(s). */
  url: string;
  /** Токен устройства: см. `device.ts`. */
  token: () => Promise<string>;
  /** Кто я сейчас: имя и уровень персонажа из сейва. Пустое имя — входа не будет. */
  identity: () => Identity;
  adminSecret?: string;
  /** Сколько ждать ответа на запрос, мс. */
  timeoutMs?: number;
  /** Фабрика сокета: в тестах подменяется. */
  socket?: (url: string) => WebSocketLike;
  log?: (line: string) => void;
}

/** Минимум от WebSocket, который нужен адаптеру: совпадает с браузером и React Native. */
export interface WebSocketLike {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
}

type Pending = { resolve: (m: ServerMessage) => void; timer: ReturnType<typeof setTimeout> };

const RETRY_MS: [number, number] = [1_000, 30_000];

export function toWsUrl(url: string): string {
  return url.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:').replace(/\/+$/, '');
}

export class ServerBackend implements GameBackend {
  private ws: WebSocketLike | null = null;
  private status: ConnectionStatus = 'offline';
  private me: Me | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  /** Ждут, пока пройдёт вход. */
  private waiters: (() => void)[] = [];
  private retry = RETRY_MS[0];
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private readonly chatListeners = new Map<ChannelId, Set<(m: ChatMessage) => void>>();
  private readonly pushListeners = new Set<(p: Push) => void>();
  private readonly statusListeners = new Set<(s: ConnectionStatus, me: Me | null) => void>();
  private readonly timeoutMs: number;
  private readonly makeSocket: (url: string) => WebSocketLike;
  private readonly log: (line: string) => void;

  constructor(private readonly opts: ServerBackendOptions) {
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    this.makeSocket = opts.socket ?? ((url) => new WebSocket(url) as unknown as WebSocketLike);
    this.log = opts.log ?? (() => {});
  }

  // --- Соединение -----------------------------------------------------------------------------

  get connection(): ConnectionStatus {
    return this.status;
  }

  /** Кто я по мнению сервера (после входа). */
  get self(): Me | null {
    return this.me;
  }

  onStatus(cb: (s: ConnectionStatus, me: Me | null) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  /** Любое событие с сервера: гильдия, таблица, роль. */
  onPush(cb: (p: Push) => void): () => void {
    this.pushListeners.add(cb);
    return () => this.pushListeners.delete(cb);
  }

  /** Поднять соединение (иначе поднимется само при первом запросе). */
  connect(): void {
    if (this.closed || this.ws) return;
    this.setStatus('connecting');
    let ws: WebSocketLike;
    try {
      ws = this.makeSocket(toWsUrl(this.opts.url));
    } catch (e) {
      this.log(`сокет не создался: ${String(e)}`);
      this.scheduleRetry();
      return;
    }
    this.ws = ws;
    ws.onopen = () => void this.hello();
    ws.onmessage = (ev) => this.receive(String(ev.data));
    ws.onerror = () => {};
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.me = null;
      this.failPending('Связь с сервером оборвалась');
      this.setStatus('offline');
      this.scheduleRetry();
    };
  }

  /** Закрыть навсегда (смена режима, тесты). */
  close(): void {
    this.closed = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
    this.failPending('Соединение закрыто');
    this.setStatus('offline');
  }

  /** Имя или уровень в сейве изменились: сказать серверу при следующем входе (или сразу, если на связи). */
  refreshIdentity(): void {
    if (this.status === 'online') void this.hello();
  }

  private scheduleRetry() {
    if (this.closed || this.retryTimer) return;
    const wait = this.retry;
    this.retry = Math.min(RETRY_MS[1], this.retry * 2);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, wait);
  }

  private setStatus(s: ConnectionStatus) {
    if (this.status === s && s !== 'online') return;
    this.status = s;
    for (const cb of this.statusListeners) cb(s, this.me);
  }

  private async hello() {
    const id = this.opts.identity();
    if (!id.name) {
      this.log('нет персонажа — входа не будет');
      return;
    }
    const params: HelloParams = { token: await this.opts.token(), name: id.name, level: id.level, rating: id.rating, adminSecret: this.opts.adminSecret, version: PROTOCOL_VERSION };
    const r = await this.rawCall('auth.hello', params, false);
    if (r.ok) {
      this.me = r.result;
      this.retry = RETRY_MS[0];
      this.setStatus('online');
      const w = this.waiters;
      this.waiters = [];
      for (const resume of w) resume();
    } else {
      this.log(`вход не удался: ${r.reason}`);
      this.failPending(r.reason);
      // Имя занято или протокол устарел: переподключение не поможет, но и мешать не будем — ждём смены имени.
      this.ws?.close();
    }
  }

  private receive(raw: string) {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    if (isPush(msg)) {
      if (msg.event === 'chat.message') for (const cb of this.chatListeners.get(msg.data.channel) ?? []) cb(msg.data);
      if (msg.event === 'me') this.me = msg.data;
      if (msg.event === 'guild.updated') for (const cb of this.pushListeners) cb({ event: 'guild.updated', data: msg.data ? this.markMine(msg.data) : null });
      else for (const cb of this.pushListeners) cb(msg);
      return;
    }
    const p = this.pending.get(msg.id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(msg.id);
    p.resolve(msg);
  }

  private failPending(reason: string) {
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.resolve({ id, ok: false, reason });
    }
    this.pending.clear();
  }

  /** Отправить запрос. `authed` — дождаться входа (все методы, кроме самого hello). */
  private async rawCall<M extends Method>(method: M, params: Methods[M]['params'], authed = true): Promise<{ ok: true; result: Methods[M]['result'] } | { ok: false; reason: string }> {
    if (this.closed) return { ok: false, reason: 'Соединение закрыто' };
    if (authed && this.status !== 'online') {
      if (!this.opts.identity().name) return { ok: false, reason: 'Сначала создай персонажа' };
      this.connect();
      const ready = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), this.timeoutMs);
        this.waiters.push(() => {
          clearTimeout(timer);
          resolve(true);
        });
      });
      if (!ready) return { ok: false, reason: 'Сервер не отвечает' };
    }
    const ws = this.ws;
    if (!ws || ws.readyState !== 1) return { ok: false, reason: 'Нет связи с сервером' };
    const id = this.nextId++;
    const req: Request<M> = { id, method, params };
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ ok: false, reason: 'Сервер не отвечает' });
      }, this.timeoutMs);
      this.pending.set(id, { resolve: (m) => resolve(m as never), timer });
      ws.send(JSON.stringify(req));
    });
  }

  private async action<M extends Method>(method: M, params: Methods[M]['params']): Promise<Check> {
    const r = await this.rawCall(method, params);
    return r.ok ? { ok: true } : { ok: false, reason: r.reason };
  }

  private async read<M extends Method>(method: M, params: Methods[M]['params']): Promise<Methods[M]['result']> {
    const r = await this.rawCall(method, params);
    if (!r.ok) throw new Error(r.reason);
    return r.result;
  }

  /** Отметить себя в составе: экраны гильдии узнают игрока по флагу `player`. */
  private markMine(g: Guild): Guild {
    const myId = this.me?.id;
    return { ...g, members: g.members.map((m) => (m.id === myId ? { ...m, player: true } : m)) };
  }

  // --- GameBackend ----------------------------------------------------------------------------

  auth: GameBackend['auth'] = {
    whoAmI: async () => {
      const me = await this.read('auth.whoAmI', {});
      return { id: me.id, name: me.name, role: me.role };
    },
    assignRole: (userId, role) => this.action('auth.assignRole', { userId, role }),
  };

  /** Список людей на сервере: кого звать в гильдию, кому менять роль. Сверх контракта. */
  users(limit = 100): Promise<UserInfo[]> {
    return this.read('auth.users', { limit });
  }

  chat: GameBackend['chat'] = {
    history: (channel, limit) => this.read('chat.history', { channel, limit }),
    send: (channel, text) => this.action('chat.send', { channel, text }),
    subscribe: (channel, onMessage) => {
      if (!this.chatListeners.has(channel)) this.chatListeners.set(channel, new Set());
      this.chatListeners.get(channel)!.add(onMessage);
      this.connect();
      return () => {
        this.chatListeners.get(channel)?.delete(onMessage);
      };
    },
    remove: (messageId) => this.action('chat.remove', { messageId }),
    mute: (userId, minutes) => this.action('chat.mute', { userId, minutes }),
    broadcast: (channel, text) => this.action('chat.broadcast', { channel, text }),
  };

  guilds: GameBackend['guilds'] & { applications(): Promise<UserInfo[]> } = {
    list: async () => (await this.read('guilds.list', {})).map((g) => this.markMine(g)),
    mine: async () => {
      const g = await this.read('guilds.mine', {});
      return g ? this.markMine(g) : null;
    },
    found: (args) => this.action('guilds.found', args),
    apply: (guildId) => this.action('guilds.apply', { guildId }),
    leave: () => this.action('guilds.leave', {}),
    disband: () => this.action('guilds.disband', {}),
    invite: (userId) => this.action('guilds.invite', { userId }),
    kick: (userId) => this.action('guilds.kick', { userId }),
    setRank: (userId, rank) => this.action('guilds.setRank', { userId, rank }),
    donate: (amount) => this.action('guilds.donate', { amount }),
    upgrade: () => this.action('guilds.upgrade', {}),
    edit: (guildId, patch) => this.action('guilds.edit', { guildId, patch }),
    /** Заявки в мою гильдию (глава и десятники). Сверх контракта. */
    applications: () => this.read('guilds.applications', {}),
  };
}

export function createServerBackend(opts: ServerBackendOptions): ServerBackend {
  return new ServerBackend(opts);
}
