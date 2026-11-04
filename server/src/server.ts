import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ChannelId } from '@/game/chat';
import { PROTOCOL_VERSION, type HelloParams, type Request, type ServerMessage } from '@/net/protocol';
import { GameCore, type Audience, type Outgoing } from './core';
import { dispatch, isMethod } from './rpc';
import type { Store } from './store';

// Транспорт: один порт на HTTP (health, публичная история) и WebSocket (всё остальное).
// Соединение до `auth.hello` — гость: любой другой запрос получает «Сначала войди».

export interface ServerOptions {
  store: Store;
  adminSecret?: string;
  log?: (line: string) => void;
}

interface Conn {
  ws: WebSocket;
  userId: string | null;
  alive: boolean;
}

const MAX_FRAME = 16 * 1024;

export function createGameServer({ store, adminSecret, log = console.log }: ServerOptions): { http: Server; core: GameCore; close(): Promise<void> } {
  const conns = new Set<Conn>();
  const byUser = new Map<string, Set<Conn>>();

  const sendTo = (c: Conn, msg: ServerMessage) => {
    if (c.ws.readyState === c.ws.OPEN) c.ws.send(JSON.stringify(msg));
  };

  const route = ({ push, to }: Outgoing) => {
    for (const c of audience(to)) sendTo(c, push);
  };

  function audience(to: Audience): Iterable<Conn> {
    if ('all' in to) return [...conns].filter((c) => c.userId);
    const ids = 'users' in to ? to.users : core.membersOf(to.guild);
    const out: Conn[] = [];
    for (const id of ids) for (const c of byUser.get(id) ?? []) out.push(c);
    return out;
  }

  const core = new GameCore(store, { adminSecret, onPush: route, isOnline: (id) => (byUser.get(id)?.size ?? 0) > 0 });

  const http = createServer((req, res) => handleHttp(core, req, res));
  const wss = new WebSocketServer({ server: http, maxPayload: MAX_FRAME });

  wss.on('connection', (ws) => {
    const c: Conn = { ws, userId: null, alive: true };
    conns.add(c);
    ws.on('pong', () => (c.alive = true));
    ws.on('message', (raw) => {
      let req: Request;
      try {
        req = JSON.parse(raw.toString()) as Request;
      } catch {
        sendTo(c, { event: 'error', data: { reason: 'Не JSON' } });
        return;
      }
      if (!req || typeof req.id !== 'number') {
        sendTo(c, { event: 'error', data: { reason: 'Нет id запроса' } });
        return;
      }
      if (req.method === 'auth.hello') {
        const p = req.params as HelloParams;
        if (p?.version !== undefined && p.version !== PROTOCOL_VERSION) {
          sendTo(c, { id: req.id, ok: false, reason: `Обнови игру: протокол ${PROTOCOL_VERSION}` });
          return;
        }
        const r = core.hello(p);
        if (r.ok) bind(c, r.result.id);
        sendTo(c, r.ok ? { id: req.id, ok: true, result: r.result } : { id: req.id, ok: false, reason: r.reason });
        return;
      }
      if (!c.userId) {
        sendTo(c, { id: req.id, ok: false, reason: 'Сначала войди' });
        return;
      }
      if (!isMethod(req.method)) {
        sendTo(c, { id: req.id, ok: false, reason: 'Такого метода нет' });
        return;
      }
      const r = dispatch(core, c.userId, req.method, req.params as never);
      sendTo(c, r.ok ? { id: req.id, ok: true, result: r.result } : { id: req.id, ok: false, reason: r.reason });
    });
    ws.on('close', () => unbind(c));
    ws.on('error', () => unbind(c));
  });

  function bind(c: Conn, userId: string) {
    unbind(c);
    c.userId = userId;
    if (!byUser.has(userId)) byUser.set(userId, new Set());
    byUser.get(userId)!.add(c);
  }

  function unbind(c: Conn) {
    if (c.userId) {
      const set = byUser.get(c.userId);
      set?.delete(c);
      if (set && set.size === 0) byUser.delete(c.userId);
    }
    c.userId = null;
    if (c.ws.readyState === c.ws.CLOSED || c.ws.readyState === c.ws.CLOSING) conns.delete(c);
  }

  // Пинг каждые 30 с: мёртвые соединения (телефон ушёл в сон) закрываем.
  const heartbeat = setInterval(() => {
    for (const c of conns) {
      if (!c.alive) {
        c.ws.terminate();
        conns.delete(c);
        continue;
      }
      c.alive = false;
      c.ws.ping();
    }
  }, 30_000);

  return {
    http,
    core,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(heartbeat);
        for (const c of conns) c.ws.terminate();
        wss.close(() => http.close(() => resolve()));
        store.flush();
        log('Сервер остановлен, состояние записано.');
      }),
  };
}

function handleHttp(core: GameCore, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (url.pathname === '/health') {
    const s = core.state;
    res.end(JSON.stringify({ ok: true, users: s.users.length, guilds: s.guilds.length, messages: s.messages.length, uptime: Math.round(process.uptime()) }));
    return;
  }
  const hist = url.pathname.match(/^\/history\/(tavern|arena)$/);
  if (hist) {
    const limit = Number(url.searchParams.get('limit') ?? 50);
    res.end(JSON.stringify(core.publicHistory(hist[1] as ChannelId, Number.isFinite(limit) ? limit : 50)));
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ ok: false, reason: 'Тут ничего нет. Есть /health и /history/tavern.' }));
}
