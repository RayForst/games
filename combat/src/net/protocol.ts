import type { ChannelId, ChatMessage } from '@/game/chat';
import type { Guild, GuildEmblem, GuildRank } from '@/game/guild';
import type { Role } from '@/game/roles';

// Протокол «телефон ↔ сервер» поверх WebSocket. Одни типы для `server/` и `src/net/serverBackend.ts`,
// чтобы контракт не расходился. Каждое сообщение — одна JSON-строка.
//
//  клиент → сервер: `Request`  — `{ id, method, params }`; первым всегда идёт `auth.hello`.
//  сервер → клиент: `Response` — `{ id, ok, result | reason }` на каждый запрос,
//                   `Push`     — `{ event, data }` без запроса: новые сообщения, правки гильдии, смена роли.

export const PROTOCOL_VERSION = 1;

export interface HelloParams {
  /** Случайный токен устройства: это и есть учётка. Хранится на телефоне, на сервере — ключ пользователя. */
  token: string;
  /** Имя персонажа; становится именем в чате и гильдии. */
  name: string;
  /** Уровень и рейтинг для проверок гильдий (`joinCheck`). Сервер их не проверяет: PvP-сервера ещё нет. */
  level?: number;
  rating?: number;
  /** Секрет из `ADMIN_SECRET`: первый вошедший с ним становится админом. */
  adminSecret?: string;
  version?: number;
}

export interface Me {
  id: string;
  name: string;
  role: Role;
  /** Моя гильдия, если есть. */
  guildId: string | null;
}

/** Методы RPC и их параметры. Имена повторяют `GameBackend`: `auth.whoAmI`, `chat.send`, `guilds.found`… */
export interface Methods {
  'auth.hello': { params: HelloParams; result: Me };
  'auth.whoAmI': { params: Record<string, never>; result: Me };
  'auth.assignRole': { params: { userId: string; role: Role }; result: null };
  'auth.users': { params: { limit?: number }; result: UserInfo[] };

  'chat.history': { params: { channel: ChannelId; limit?: number }; result: ChatMessage[] };
  'chat.send': { params: { channel: ChannelId; text: string }; result: null };
  'chat.remove': { params: { messageId: string }; result: null };
  'chat.mute': { params: { userId: string; minutes: number }; result: null };
  'chat.broadcast': { params: { channel: ChannelId; text: string }; result: null };

  'guilds.list': { params: Record<string, never>; result: Guild[] };
  'guilds.mine': { params: Record<string, never>; result: Guild | null };
  'guilds.found': { params: { name: string; tag: string; emblem: GuildEmblem; motto?: string }; result: Guild };
  'guilds.apply': { params: { guildId: string }; result: null };
  'guilds.leave': { params: Record<string, never>; result: null };
  'guilds.disband': { params: Record<string, never>; result: null };
  'guilds.invite': { params: { userId: string }; result: null };
  'guilds.kick': { params: { userId: string }; result: null };
  'guilds.setRank': { params: { userId: string; rank: GuildRank }; result: null };
  'guilds.donate': { params: { amount: number }; result: null };
  'guilds.upgrade': { params: Record<string, never>; result: null };
  'guilds.edit': { params: { guildId: string; patch: GuildPatch }; result: null };
  'guilds.applications': { params: Record<string, never>; result: UserInfo[] };
}

export type GuildPatch = Partial<Pick<Guild, 'name' | 'tag' | 'motto' | 'level' | 'treasury' | 'rating'>>;

export type Method = keyof Methods;

export interface UserInfo {
  id: string;
  name: string;
  role: Role;
  level: number;
  guildId: string | null;
  online: boolean;
  mutedUntil: number | null;
}

export interface Request<M extends Method = Method> {
  id: number;
  method: M;
  params: Methods[M]['params'];
}

export type Response<M extends Method = Method> =
  | { id: number; ok: true; result: Methods[M]['result'] }
  | { id: number; ok: false; reason: string };

/** События без запроса. */
export type Push =
  /** Новое или изменённое (удалённое) сообщение в канале, который виден получателю. */
  | { event: 'chat.message'; data: ChatMessage }
  /** Моя гильдия изменилась (или я из неё выбыл: null). */
  | { event: 'guild.updated'; data: Guild | null }
  /** Таблица гильдий изменилась: кто-то основал, распустил, поднял уровень. */
  | { event: 'guild.ladder'; data: Guild[] }
  /** Мне сменили роль или заткнули. */
  | { event: 'me'; data: Me }
  | { event: 'error'; data: { reason: string } };

export type ServerMessage = Response | Push;

export function isPush(m: ServerMessage): m is Push {
  return 'event' in m;
}
