import type { Method, Methods } from '@/net/protocol';
import type { GameCore, Result } from './core';

// Разбор запроса: имя метода → вызов ядра от имени вошедшего пользователя.
// `auth.hello` сюда не попадает: его обрабатывает транспорт, потому что он и создаёт пользователя.

type Handler<M extends Method> = (core: GameCore, userId: string, params: Methods[M]['params']) => Result<Methods[M]['result']>;

const HANDLERS: { [M in Exclude<Method, 'auth.hello'>]: Handler<M> } = {
  'auth.whoAmI': (core, uid) => core.whoAmI(uid),
  'auth.assignRole': (core, uid, p) => core.assignRole(uid, p.userId, p.role),
  'auth.users': (core, _uid, p) => core.users(p?.limit),

  'chat.history': (core, uid, p) => core.history(uid, p.channel, p.limit),
  'chat.send': (core, uid, p) => core.send(uid, p.channel, p.text),
  'chat.remove': (core, uid, p) => core.remove(uid, p.messageId),
  'chat.mute': (core, uid, p) => core.mute(uid, p.userId, p.minutes),
  'chat.broadcast': (core, uid, p) => core.broadcast(uid, p.channel, p.text),

  'guilds.list': (core) => core.list(),
  'guilds.mine': (core, uid) => core.mine(uid),
  'guilds.found': (core, uid, p) => core.found(uid, p),
  'guilds.apply': (core, uid, p) => core.apply(uid, p.guildId),
  'guilds.leave': (core, uid) => core.leave(uid),
  'guilds.disband': (core, uid) => core.disband(uid),
  'guilds.invite': (core, uid, p) => core.invite(uid, p.userId),
  'guilds.kick': (core, uid, p) => core.kick(uid, p.userId),
  'guilds.setRank': (core, uid, p) => core.setRank(uid, p.userId, p.rank),
  'guilds.donate': (core, uid, p) => core.donate(uid, p.amount),
  'guilds.upgrade': (core, uid) => core.upgrade(uid),
  'guilds.edit': (core, uid, p) => core.edit(uid, p.guildId, p.patch),
  'guilds.applications': (core, uid) => core.applications(uid),
};

export function isMethod(name: unknown): name is Exclude<Method, 'auth.hello'> {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(HANDLERS, name);
}

export function dispatch<M extends Exclude<Method, 'auth.hello'>>(core: GameCore, userId: string, method: M, params: Methods[M]['params']): Result<Methods[M]['result']> {
  const h = HANDLERS[method] as Handler<M>;
  try {
    return h(core, userId, params ?? ({} as Methods[M]['params']));
  } catch (e) {
    console.error(`[rpc] ${method} упал:`, e);
    return { ok: false, reason: 'Сервер споткнулся' };
  }
}
