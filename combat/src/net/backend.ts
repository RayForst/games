import type { ChannelId, ChatMessage } from '@/game/chat';
import type { Guild, GuildEmblem, GuildRank } from '@/game/guild';
import type { Role } from '@/game/roles';
import type { Check } from '@/game/character';

/**
 * Контракт сервера. Сервера пока нет: чат, гильдии и роли живут в сейве на телефоне, а эти
 * интерфейсы — договорённость о том, что именно переедет на сервер и в каком виде. Стор
 * (`src/store/useGame.ts`) сегодня и есть «локальный бэкенд»: его действия повторяют эти методы
 * один в один, поэтому при появлении сервера экраны не меняются, меняется только то, кто отвечает.
 *
 * Что по-честному требует сервера, а не телефона:
 *  - роли: сейчас роль — поле в сейве, открывается словом ключника; на сервере — из учётки;
 *  - чат: сейчас собеседники — NPC, живых игроков нет; на сервере — общая лента и модерация;
 *  - гильдии: сейчас состав — игрок и NPC; на сервере — живые люди, заявки, общая казна.
 */

export interface AuthBackend {
  /** Кто я и какая у меня роль (приходит с сервера, не из сейва). */
  whoAmI(): Promise<{ id: string; name: string; role: Role }>;
  /** Админ меняет роль другому (role.assign). */
  assignRole(userId: string, role: Role): Promise<Check>;
}

export interface ChatBackend {
  history(channel: ChannelId, limit?: number): Promise<ChatMessage[]>;
  send(channel: ChannelId, text: string): Promise<Check>;
  /** Живые события: новые сообщения, удаления. Возвращает отписку. */
  subscribe(channel: ChannelId, onMessage: (m: ChatMessage) => void): () => void;
  /** Модерация (chat.moderate). */
  remove(messageId: string): Promise<Check>;
  mute(userId: string, minutes: number): Promise<Check>;
  /** Слово от имени мира (chat.broadcast). */
  broadcast(channel: ChannelId, text: string): Promise<Check>;
}

export interface GuildBackend {
  list(): Promise<Guild[]>;
  mine(): Promise<Guild | null>;
  found(args: { name: string; tag: string; emblem: GuildEmblem; motto?: string }): Promise<Check>;
  apply(guildId: string): Promise<Check>;
  leave(): Promise<Check>;
  disband(): Promise<Check>;
  invite(userId: string): Promise<Check>;
  kick(userId: string): Promise<Check>;
  setRank(userId: string, rank: GuildRank): Promise<Check>;
  donate(amount: number): Promise<Check>;
  upgrade(): Promise<Check>;
  /** Мастер правит любую гильдию (guild.manageAny). */
  edit(guildId: string, patch: Partial<Pick<Guild, 'name' | 'tag' | 'motto' | 'level' | 'treasury' | 'rating'>>): Promise<Check>;
}

export interface GameBackend {
  auth: AuthBackend;
  chat: ChatBackend;
  guilds: GuildBackend;
}

/**
 * Реализации: `localBackend.ts` (стор на телефоне, офлайн как всегда) и `serverBackend.ts`
 * (WebSocket к `server/`, протокол в `protocol.ts`). Какая работает — решает `index.ts` по
 * `EXPO_PUBLIC_BACKEND_URL`: пусто — локальный режим, иначе адрес сервера. Переменные `EXPO_PUBLIC_*`
 * Expo вшивает в бандл на сборке, поэтому режим меняется перезапуском Metro.
 */
export const BACKEND_URL: string = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
export const BACKEND_MODE: 'local' | 'server' = BACKEND_URL ? 'server' : 'local';
