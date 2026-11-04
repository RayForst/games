import { createHash, randomBytes } from 'node:crypto';
import { CHANNELS_BY_ID, CHAT_LIMIT, WORLD_AUTHOR, cleanText, validateMessage, type ChannelId, type ChatAuthor, type ChatMessage } from '@/game/chat';
import type { Character } from '@/game/types';
import {
  GUILD_EMBLEMS,
  GUILD_MAX_LEVEL,
  GUILD_MIN_LEVEL,
  addGuildEvent,
  addMember,
  canUpgradeGuild,
  guildLadder,
  guildLevelCost,
  joinCheck,
  newGuild,
  removeMember,
  setRank as setGuildRank,
  validateGuildName,
  validateGuildTag,
  type Guild,
  type GuildMember,
  type GuildRank,
} from '@/game/guild';
import { ROLES, can, type Permission, type Role } from '@/game/roles';
import type { Check } from '@/game/character';
import type { GuildPatch, HelloParams, Me, Push, UserInfo } from '@/net/protocol';
import type { State, Store, StoredMessage, User } from './store';

// Ядро сервера: все правила без сети. Транспорт (`index.ts`) только разбирает JSON и раздаёт события.
// Формулы и проверки — из `combat/src/game`: сервер их не копирует, а импортирует.

/** Кому уходит событие. */
export type Audience = { all: true } | { users: string[] } | { guild: string };

export interface Outgoing {
  push: Push;
  to: Audience;
}

export interface CoreOptions {
  adminSecret?: string;
  now?: () => number;
  onPush?: (out: Outgoing) => void;
  /** Кто сейчас на связи: для `online` в списках. */
  isOnline?: (userId: string) => boolean;
}

export type Result<T> = { ok: true; result: T } | { ok: false; reason: string };

const ok = <T>(result: T): Result<T> => ({ ok: true, result });
const fail = (reason: string): Result<never> => ({ ok: false, reason });
const NAME_LEN: [number, number] = [2, 16];
const MOTTO_MAX = 60;
const ROLE_ORDER: Record<Role, number> = { player: 0, moderator: 1, gm: 2, admin: 3 };

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function validateName(name: string): Check {
  const n = name.replace(/\s+/g, ' ').trim();
  if (n.length < NAME_LEN[0]) return { ok: false, reason: `Имя от ${NAME_LEN[0]} букв` };
  if (n.length > NAME_LEN[1]) return { ok: false, reason: `Имя до ${NAME_LEN[1]} букв` };
  if (!/^[а-яёa-z0-9 \-']+$/i.test(n)) return { ok: false, reason: 'Имя: буквы, цифры, пробел и дефис' };
  return { ok: true };
}

export class GameCore {
  private readonly now: () => number;
  private readonly onPush: (out: Outgoing) => void;
  private readonly isOnline: (userId: string) => boolean;

  constructor(
    private readonly store: Store,
    private readonly opts: CoreOptions = {},
  ) {
    this.now = opts.now ?? (() => Date.now());
    this.onPush = opts.onPush ?? (() => {});
    this.isOnline = opts.isOnline ?? (() => false);
  }

  get state(): State {
    return this.store.state;
  }

  // --- Служебное ------------------------------------------------------------------------------

  private uid(prefix: string): string {
    return `${prefix}_${randomBytes(6).toString('hex')}`;
  }

  private user(id: string): User | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  private guild(id: string | null | undefined): Guild | undefined {
    return id ? this.state.guilds.find((g) => g.id === id) : undefined;
  }

  private me(u: User): Me {
    return { id: u.id, name: u.name, role: u.role, guildId: u.guildId };
  }

  private info(u: User): UserInfo {
    return { id: u.id, name: u.name, role: u.role, level: u.level, guildId: u.guildId, online: this.isOnline(u.id), mutedUntil: this.mutedUntil(u) };
  }

  private mutedUntil(u: User): number | null {
    return u.mutedUntil && u.mutedUntil > this.now() ? u.mutedUntil : null;
  }

  private author(u: User): ChatAuthor {
    const a: ChatAuthor = { id: u.id, name: u.name, tag: this.guild(u.guildId)?.tag ?? null };
    if (u.role !== 'player') a.role = u.role;
    return a;
  }

  private need(u: User, permission: Permission): Check {
    return can(u.role, permission) ? { ok: true } : { ok: false, reason: 'Нет прав' };
  }

  private rankOf(g: Guild, userId: string): GuildRank | null {
    return g.members.find((m) => m.id === userId)?.rank ?? null;
  }

  private replaceGuild(g: Guild) {
    this.state.guilds = this.state.guilds.map((x) => (x.id === g.id ? g : x));
    this.store.touch();
    this.onPush({ push: { event: 'guild.updated', data: g }, to: { guild: g.id } });
  }

  private pushLadder() {
    this.onPush({ push: { event: 'guild.ladder', data: this.ladder() }, to: { all: true } });
  }

  /** Стена сообщений одного стола: публичные каналы общие, у «Гильдии» — своя лента на каждую гильдию. */
  private wall(channel: ChannelId, guildId?: string): StoredMessage[] {
    return this.state.messages.filter((m) => m.channel === channel && (channel !== 'guild' || m.guildId === guildId));
  }

  private append(msg: StoredMessage) {
    this.state.messages.push(msg);
    // Лента каждого стола — не длиннее CHAT_LIMIT: лишнее сверху выкидываем.
    const wall = this.wall(msg.channel, msg.guildId);
    if (wall.length > CHAT_LIMIT) {
      const drop = new Set(wall.slice(0, wall.length - CHAT_LIMIT).map((m) => m.id));
      this.state.messages = this.state.messages.filter((m) => !drop.has(m.id));
    }
    this.store.touch();
    this.onPush({ push: { event: 'chat.message', data: this.strip(msg) }, to: msg.channel === 'guild' && msg.guildId ? { guild: msg.guildId } : { all: true } });
  }

  private strip(m: StoredMessage): ChatMessage {
    const { guildId: _guildId, ...rest } = m;
    return rest;
  }

  /** Слово мира: системное сообщение в канал. */
  private worldSays(channel: ChannelId, text: string, guildId?: string) {
    this.append({ id: this.uid('m'), channel, at: this.now(), author: WORLD_AUTHOR, text, kind: 'system', guildId });
  }

  // --- Вход и роли ----------------------------------------------------------------------------

  hello(p: HelloParams): Result<Me> {
    if (!p || typeof p.token !== 'string' || p.token.length < 8) return fail('Нет токена устройства');
    const name = (p.name ?? '').replace(/\s+/g, ' ').trim();
    const tokenHash = hashToken(p.token);
    const now = this.now();
    let u = this.state.users.find((x) => x.tokenHash === tokenHash);
    if (!u || u.name.toLowerCase() !== name.toLowerCase()) {
      const v = validateName(name);
      if (!v.ok) return fail(v.reason!);
      if (this.state.users.some((x) => x !== u && x.name.toLowerCase() === name.toLowerCase())) return fail('Имя занято');
    }
    if (!u) {
      u = { id: this.uid('u'), tokenHash, name, role: 'player', level: 0, rating: 0, guildId: null, createdAt: now, lastSeenAt: now, mutedUntil: null };
      this.state.users.push(u);
    } else if (u.name !== name) {
      // Персонаж переименовался (или сейв стёрт и начат заново): имя в гильдии тоже меняем.
      const g = this.guild(u.guildId);
      if (g) this.state.guilds = this.state.guilds.map((x) => (x.id === g.id ? { ...x, members: x.members.map((m) => (m.id === u!.id ? { ...m, name } : m)) } : x));
      u.name = name;
    }
    if (typeof p.level === 'number' && Number.isFinite(p.level)) u.level = Math.max(0, Math.floor(p.level));
    if (typeof p.rating === 'number' && Number.isFinite(p.rating)) u.rating = Math.max(0, Math.floor(p.rating));
    u.lastSeenAt = now;
    const g = this.guild(u.guildId);
    if (g) this.state.guilds = this.state.guilds.map((x) => (x.id === g.id ? { ...x, members: x.members.map((m) => (m.id === u!.id ? { ...m, level: u!.level } : m)) } : x));
    // Первый, кто пришёл с секретом, — админ. Дальше роли раздаёт он.
    if (p.adminSecret && this.opts.adminSecret && p.adminSecret === this.opts.adminSecret && !this.state.users.some((x) => x.role === 'admin')) {
      u.role = 'admin';
    }
    this.store.touch();
    return ok(this.me(u));
  }

  whoAmI(userId: string): Result<Me> {
    const u = this.user(userId);
    return u ? ok(this.me(u)) : fail('Кто ты?');
  }

  users(limit = 100): Result<UserInfo[]> {
    const list = [...this.state.users].sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, Math.max(1, Math.min(500, limit)));
    return ok(list.map((u) => this.info(u)));
  }

  assignRole(actorId: string, userId: string, role: Role): Result<null> {
    const actor = this.user(actorId);
    if (!actor) return fail('Кто ты?');
    const p = this.need(actor, 'role.assign');
    if (!p.ok) return fail(p.reason!);
    if (!ROLES.includes(role)) return fail('Такой роли нет');
    const target = this.user(userId);
    if (!target) return fail('Такого нет');
    if (target.role === role) return fail('Уже');
    target.role = role;
    this.store.touch();
    this.onPush({ push: { event: 'me', data: this.me(target) }, to: { users: [target.id] } });
    return ok(null);
  }

  // --- Чат ------------------------------------------------------------------------------------

  history(userId: string, channel: ChannelId, limit = 50): Result<ChatMessage[]> {
    const u = this.user(userId);
    if (!u) return fail('Кто ты?');
    if (!CHANNELS_BY_ID[channel]) return fail('Такого канала нет');
    if (channel === 'guild' && !u.guildId) return ok([]);
    const seeDeleted = can(u.role, 'chat.moderate');
    const wall = this.wall(channel, u.guildId ?? undefined).filter((m) => seeDeleted || !m.deleted);
    return ok(wall.slice(Math.max(0, wall.length - Math.max(1, Math.min(CHAT_LIMIT, limit)))).map((m) => this.strip(m)));
  }

  /** Публичная история без входа (HTTP): только общие столы, без удалённого. */
  publicHistory(channel: ChannelId, limit = 50): ChatMessage[] {
    if (channel === 'guild' || !CHANNELS_BY_ID[channel]) return [];
    const wall = this.wall(channel).filter((m) => !m.deleted);
    return wall.slice(Math.max(0, wall.length - Math.max(1, Math.min(CHAT_LIMIT, limit)))).map((m) => this.strip(m));
  }

  send(userId: string, channel: ChannelId, text: string): Result<null> {
    const u = this.user(userId);
    if (!u) return fail('Кто ты?');
    if (!CHANNELS_BY_ID[channel]) return fail('Такого канала нет');
    const v = validateMessage(text ?? '');
    if (!v.ok) return fail(v.reason!);
    const until = this.mutedUntil(u);
    if (until) return fail(`Тебя заткнули ещё на ${Math.max(1, Math.ceil((until - this.now()) / 60_000))} мин.`);
    if (channel === 'guild' && !u.guildId) return fail('Ты не в гильдии');
    this.append({
      id: this.uid('m'),
      channel,
      at: this.now(),
      author: this.author(u),
      text: cleanText(text),
      kind: u.role === 'player' ? 'player' : 'staff',
      guildId: channel === 'guild' ? u.guildId! : undefined,
    });
    return ok(null);
  }

  remove(actorId: string, messageId: string): Result<null> {
    const actor = this.user(actorId);
    if (!actor) return fail('Кто ты?');
    const p = this.need(actor, 'chat.moderate');
    if (!p.ok) return fail(p.reason!);
    const m = this.state.messages.find((x) => x.id === messageId);
    if (!m) return fail('Сообщения нет');
    if (m.deleted) return fail('Уже удалено');
    m.deleted = true;
    this.store.touch();
    this.onPush({ push: { event: 'chat.message', data: this.strip(m) }, to: m.channel === 'guild' && m.guildId ? { guild: m.guildId } : { all: true } });
    return ok(null);
  }

  /** Заткнуть на N минут; 0 — вернуть голос. */
  mute(actorId: string, userId: string, minutes: number): Result<null> {
    const actor = this.user(actorId);
    if (!actor) return fail('Кто ты?');
    const p = this.need(actor, 'chat.moderate');
    if (!p.ok) return fail(p.reason!);
    const target = this.user(userId);
    if (!target) return fail('Такого нет');
    if (target.id === actor.id) return fail('Себя не заткнёшь');
    if (ROLE_ORDER[target.role] >= ROLE_ORDER[actor.role]) return fail('Он тебе не по чину');
    const mins = Math.floor(Number(minutes));
    if (!Number.isFinite(mins) || mins < 0) return fail('Сколько-сколько минут?');
    if (mins === 0) {
      if (!this.mutedUntil(target)) return fail('Он и не молчал');
      target.mutedUntil = null;
      this.store.touch();
      this.worldSays('tavern', `${target.name} снова может говорить.`);
      return ok(null);
    }
    target.mutedUntil = this.now() + Math.min(mins, 7 * 24 * 60) * 60_000;
    this.store.touch();
    this.worldSays('tavern', `${target.name} заткнут на ${mins} мин. Смотрящий решил.`);
    return ok(null);
  }

  broadcast(actorId: string, channel: ChannelId, text: string): Result<null> {
    const actor = this.user(actorId);
    if (!actor) return fail('Кто ты?');
    const p = this.need(actor, 'chat.broadcast');
    if (!p.ok) return fail(p.reason!);
    if (!CHANNELS_BY_ID[channel]) return fail('Такого канала нет');
    const v = validateMessage(text ?? '');
    if (!v.ok) return fail(v.reason!);
    if (channel === 'guild' && !actor.guildId) return fail('Ты не в гильдии: некому говорить');
    this.worldSays(channel, cleanText(text), channel === 'guild' ? actor.guildId! : undefined);
    return ok(null);
  }

  // --- Гильдии --------------------------------------------------------------------------------

  ladder(): Guild[] {
    return guildLadder(null, this.state.guilds);
  }

  list(): Result<Guild[]> {
    return ok(this.ladder());
  }

  mine(userId: string): Result<Guild | null> {
    const u = this.user(userId);
    if (!u) return fail('Кто ты?');
    return ok(this.guild(u.guildId) ?? null);
  }

  found(userId: string, args: { name: string; tag: string; emblem: string; motto?: string }): Result<Guild> {
    const u = this.user(userId);
    if (!u) return fail('Кто ты?');
    if (u.guildId) return fail('Ты уже в гильдии');
    if (u.level < GUILD_MIN_LEVEL) return fail(`С ${GUILD_MIN_LEVEL} уровня`);
    const n = validateGuildName(args.name ?? '', this.state.guilds.map((g) => g.name));
    if (!n.ok) return fail(n.reason!);
    const t = validateGuildTag(args.tag ?? '', this.state.guilds.map((g) => g.tag));
    if (!t.ok) return fail(t.reason!);
    if (!GUILD_EMBLEMS.some((e) => e.id === args.emblem)) return fail('Такого герба нет');
    const now = this.now();
    const fresh = newGuild({ id: this.uid('g'), name: args.name, tag: args.tag, emblem: args.emblem as Guild['emblem'], motto: (args.motto ?? '').slice(0, MOTTO_MAX), founder: { id: u.id, name: u.name, level: u.level }, now });
    // На сервере все члены — живые люди: флаг `player` ставит телефон сам, для себя.
    const g: Guild = { ...fresh, members: fresh.members.map(({ player: _p, ...m }) => m) };
    this.state.guilds.push(g);
    u.guildId = g.id;
    this.store.touch();
    this.worldSays('tavern', `В городе новая гильдия: «${g.name}» [${g.tag}]. Основал ${u.name}.`);
    this.worldSays('guild', `Гильдия «${g.name}» основана. Это ваш стол: чужие не слышат.`, g.id);
    this.onPush({ push: { event: 'guild.updated', data: g }, to: { users: [u.id] } });
    this.pushLadder();
    return ok(g);
  }

  apply(userId: string, guildId: string): Result<null> {
    const u = this.user(userId);
    if (!u) return fail('Кто ты?');
    if (u.guildId) return fail('Ты уже в гильдии');
    const g = this.guild(guildId);
    if (!g) return fail('Такой гильдии нет');
    // joinCheck смотрит только уровень и рейтинг: остального о персонаже сервер не знает.
    const chk = joinCheck({ level: u.level, rating: u.rating } as Character, g);
    if (!chk.ok) return fail(chk.reason!);
    const apps = this.state.applications[g.id] ?? [];
    if (apps.includes(u.id)) return fail('Ты уже просился. Жди.');
    this.state.applications[g.id] = [...apps, u.id];
    this.replaceGuild(addGuildEvent(g, `${u.name} просится в гильдию.`, this.now()));
    return ok(null);
  }

  applications(userId: string): Result<UserInfo[]> {
    const u = this.user(userId);
    if (!u) return fail('Кто ты?');
    const g = this.guild(u.guildId);
    if (!g) return fail('Ты не в гильдии');
    const rank = this.rankOf(g, u.id);
    if (rank !== 'leader' && rank !== 'officer') return fail('Заявки смотрят глава и десятники');
    const ids = this.state.applications[g.id] ?? [];
    return ok(ids.map((id) => this.user(id)).filter((x): x is User => !!x).map((x) => this.info(x)));
  }

  leave(userId: string): Result<null> {
    const u = this.user(userId);
    if (!u) return fail('Кто ты?');
    const g = this.guild(u.guildId);
    if (!g) return fail('Ты не в гильдии');
    if (this.rankOf(g, u.id) === 'leader') return fail('Глава не уходит. Распусти гильдию.');
    const r = removeMember(g, u.id, 'leave', this.now());
    if (!r.ok) return fail(r.reason!);
    u.guildId = null;
    this.replaceGuild(r.guild);
    this.onPush({ push: { event: 'guild.updated', data: null }, to: { users: [u.id] } });
    return ok(null);
  }

  disband(userId: string): Result<null> {
    const u = this.user(userId);
    if (!u) return fail('Кто ты?');
    const g = this.guild(u.guildId);
    if (!g) return fail('Ты не в гильдии');
    if (this.rankOf(g, u.id) !== 'leader') return fail('Распускает только глава');
    return this.dissolve(g, `Гильдия «${g.name}» [${g.tag}] распущена. ${u.name} пьёт один.`);
  }

  private dissolve(g: Guild, news: string): Result<null> {
    const members = g.members.map((m) => m.id);
    for (const m of this.state.users) if (m.guildId === g.id) m.guildId = null;
    this.state.guilds = this.state.guilds.filter((x) => x.id !== g.id);
    this.state.messages = this.state.messages.filter((m) => m.guildId !== g.id);
    delete this.state.applications[g.id];
    this.store.touch();
    this.onPush({ push: { event: 'guild.updated', data: null }, to: { users: members } });
    this.worldSays('tavern', news);
    this.pushLadder();
    return ok(null);
  }

  invite(actorId: string, userId: string): Result<null> {
    const actor = this.user(actorId);
    if (!actor) return fail('Кто ты?');
    const g = this.guild(actor.guildId);
    if (!g) return fail('Ты не в гильдии');
    const rank = this.rankOf(g, actor.id);
    if (rank !== 'leader' && rank !== 'officer') return fail('Зовут глава и десятники');
    const target = this.user(userId);
    if (!target) return fail('Такого нет');
    if (target.guildId) return fail('Он уже в гильдии');
    const now = this.now();
    const r = addMember(g, { id: target.id, name: target.name, level: target.level }, now);
    if (!r.ok) return fail(r.reason!);
    target.guildId = g.id;
    this.state.applications[g.id] = (this.state.applications[g.id] ?? []).filter((id) => id !== target.id);
    this.replaceGuild(r.guild);
    this.worldSays('guild', `${target.name} принят в «${g.name}». Позвал ${actor.name}.`, g.id);
    return ok(null);
  }

  kick(actorId: string, userId: string): Result<null> {
    const actor = this.user(actorId);
    if (!actor) return fail('Кто ты?');
    const g = this.guild(actor.guildId);
    if (!g) return fail('Ты не в гильдии');
    const rank = this.rankOf(g, actor.id);
    if (rank !== 'leader' && rank !== 'officer') return fail('Выгоняют глава и десятники');
    if (userId === actor.id) return fail('Себя не выгонишь');
    const targetRank = this.rankOf(g, userId);
    if (!targetRank) return fail('Такого нет');
    if (targetRank === 'officer' && rank !== 'leader') return fail('Десятника выгоняет глава');
    const r = removeMember(g, userId, 'kick', this.now());
    if (!r.ok) return fail(r.reason!);
    const target = this.user(userId);
    if (target) target.guildId = null;
    this.replaceGuild(r.guild);
    this.onPush({ push: { event: 'guild.updated', data: null }, to: { users: [userId] } });
    return ok(null);
  }

  setRank(actorId: string, userId: string, rank: GuildRank): Result<null> {
    const actor = this.user(actorId);
    if (!actor) return fail('Кто ты?');
    const g = this.guild(actor.guildId);
    if (!g) return fail('Ты не в гильдии');
    if (this.rankOf(g, actor.id) !== 'leader') return fail('Ранги раздаёт глава');
    if (rank !== 'officer' && rank !== 'member' && rank !== 'leader') return fail('Такого ранга нет');
    const r = setGuildRank(g, userId, rank, this.now());
    if (!r.ok) return fail(r.reason!);
    this.replaceGuild(r.guild);
    return ok(null);
  }

  /** Взнос в казну. Кредиты списывает телефон: PvP-сервера с кошельками ещё нет. */
  donate(userId: string, amount: number): Result<null> {
    const u = this.user(userId);
    if (!u) return fail('Кто ты?');
    const g = this.guild(u.guildId);
    if (!g) return fail('Ты не в гильдии');
    const sum = Math.floor(Number(amount));
    if (!Number.isFinite(sum) || sum <= 0) return fail('Сколько-сколько?');
    if (sum > 100_000) return fail('Столько не бывает');
    this.replaceGuild(addGuildEvent({ ...g, treasury: g.treasury + sum }, `${u.name} внёс ${sum} кр.`, this.now()));
    return ok(null);
  }

  upgrade(userId: string): Result<null> {
    const u = this.user(userId);
    if (!u) return fail('Кто ты?');
    const g = this.guild(u.guildId);
    if (!g) return fail('Ты не в гильдии');
    if (this.rankOf(g, u.id) !== 'leader') return fail('Уровень поднимает глава');
    const chk = canUpgradeGuild(g);
    if (!chk.ok) return fail(chk.reason!);
    const cost = guildLevelCost(g.level);
    const next = addGuildEvent({ ...g, treasury: g.treasury - cost, level: g.level + 1 }, `Гильдия выросла до ${g.level + 1} уровня за ${cost} кр.`, this.now());
    this.replaceGuild(next);
    this.worldSays('tavern', `«${next.name}» [${next.tag}] теперь ${next.level} уровня. Стол в пивной стал шире.`);
    this.pushLadder();
    return ok(null);
  }

  /** Мастер правит любую гильдию. */
  edit(actorId: string, guildId: string, patch: GuildPatch): Result<null> {
    const actor = this.user(actorId);
    if (!actor) return fail('Кто ты?');
    const p = this.need(actor, 'guild.manageAny');
    if (!p.ok) return fail(p.reason!);
    const g = this.guild(guildId);
    if (!g) return fail('Такой гильдии нет');
    if (!patch || typeof patch !== 'object') return fail('Нечего править');
    const others = this.state.guilds.filter((x) => x.id !== g.id);
    let next: Guild = { ...g };
    if (patch.name !== undefined) {
      const v = validateGuildName(patch.name, others.map((x) => x.name));
      if (!v.ok) return fail(v.reason!);
      next.name = patch.name.replace(/\s+/g, ' ').trim();
    }
    if (patch.tag !== undefined) {
      const v = validateGuildTag(patch.tag, others.map((x) => x.tag));
      if (!v.ok) return fail(v.reason!);
      next.tag = patch.tag.trim().toUpperCase();
    }
    if (patch.motto !== undefined) next.motto = cleanText(patch.motto).slice(0, MOTTO_MAX);
    if (patch.level !== undefined) {
      const lvl = Math.floor(Number(patch.level));
      if (!Number.isFinite(lvl)) return fail('Уровень — число');
      next.level = Math.max(1, Math.min(GUILD_MAX_LEVEL, lvl));
    }
    if (patch.treasury !== undefined) {
      const t = Math.floor(Number(patch.treasury));
      if (!Number.isFinite(t)) return fail('Казна — число');
      next.treasury = Math.max(0, t);
    }
    if (patch.rating !== undefined) {
      const r = Math.floor(Number(patch.rating));
      if (!Number.isFinite(r)) return fail('Слава — число');
      next.rating = Math.max(0, r);
    }
    next = addGuildEvent(next, 'Мастер игры поправил гильдию.', this.now());
    this.replaceGuild(next);
    this.pushLadder();
    return ok(null);
  }

  /** Мастер распускает любую гильдию (guild.manageAny). */
  disbandAny(actorId: string, guildId: string): Result<null> {
    const actor = this.user(actorId);
    if (!actor) return fail('Кто ты?');
    const p = this.need(actor, 'guild.manageAny');
    if (!p.ok) return fail(p.reason!);
    const g = this.guild(guildId);
    if (!g) return fail('Такой гильдии нет');
    return this.dissolve(g, `Мастер игры распустил «${g.name}» [${g.tag}].`);
  }

  /** Кто входит в гильдию: для рассылки событий. */
  membersOf(guildId: string): string[] {
    return (this.guild(guildId)?.members ?? []).map((m: GuildMember) => m.id);
  }
}
