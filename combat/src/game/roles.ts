import type { Check } from './character';

// Роли и права. Сегодня роль живёт в сейве на телефоне (сервера нет), и «режим ГМа» — служебный
// экран владельца для проверки игры. С сервером роль будет приходить из учётки, а проверки
// `can()` останутся те же — на них завязан интерфейс.

export type Role = 'player' | 'moderator' | 'gm' | 'admin';

export const ROLES: Role[] = ['player', 'moderator', 'gm', 'admin'];

export const ROLE_LABELS: Record<Role, string> = {
  player: 'Игрок',
  moderator: 'Смотрящий',
  gm: 'Мастер игры',
  admin: 'Админ',
};

export const ROLE_HINTS: Record<Role, string> = {
  player: 'Обычный боец. Никаких кнопок сверх игры.',
  moderator: 'Следит за чатом: удаляет сообщения, затыкает болтунов.',
  gm: 'Ведёт игру: раздаёт кредиты и опыт, переносит бойцов, правит гильдии, пишет от имени мира.',
  admin: 'Всё, что может мастер, плюс раздача ролей и сброс сейва.',
};

/** Метка роли в чате и в списках. У игрока метки нет. */
export const ROLE_TAGS: Record<Role, string | null> = {
  player: null,
  moderator: 'СМ',
  gm: 'ГМ',
  admin: 'АДМ',
};

export type Permission =
  /** Удалять сообщения и затыкать авторов. */
  | 'chat.moderate'
  /** Писать от имени мира и в любой канал. */
  | 'chat.broadcast'
  /** Править и распускать любые гильдии, в том числе чужие. */
  | 'guild.manageAny'
  /** Выдавать кредиты, опыт, уровни, вещи, лечить. */
  | 'player.grant'
  /** Переносить по карте, завершать смены и дороги, менять день. */
  | 'world.control'
  /** Менять роли. */
  | 'role.assign'
  /** Стирать сейв. */
  | 'save.reset';

const GRANTS: Record<Role, Permission[]> = {
  player: [],
  moderator: ['chat.moderate'],
  gm: ['chat.moderate', 'chat.broadcast', 'guild.manageAny', 'player.grant', 'world.control'],
  admin: ['chat.moderate', 'chat.broadcast', 'guild.manageAny', 'player.grant', 'world.control', 'role.assign', 'save.reset'],
};

export function can(role: Role, permission: Permission): boolean {
  return GRANTS[role].includes(permission);
}

export function permissionsOf(role: Role): Permission[] {
  return GRANTS[role];
}

/** Служебная учётка. Пока сервера нет — это просто флаг в сейве и роль, которую владелец переключает руками. */
export interface Account {
  role: Role;
  /** Служебный вход открыт словом ключника: после этого роль можно менять. */
  gmUnlocked: boolean;
}

export function newAccount(): Account {
  return { role: 'player', gmUnlocked: false };
}

/**
 * Слово ключника. Это не защита (сейв лежит на телефоне, его можно править руками),
 * а щеколда от случайного нажатия. Настоящие роли появятся только с сервером.
 */
export const GM_WORD = 'ключник';

export function checkGmWord(word: string): Check {
  if (word.trim().toLowerCase() === GM_WORD) return { ok: true };
  return { ok: false, reason: 'Ключник тебя не знает' };
}

/** Можно ли сменить роль: без сервера — только после слова ключника; админ может всегда. */
export function canSwitchRole(account: Account, to: Role): Check {
  if (!ROLES.includes(to)) return { ok: false, reason: 'Такой роли нет' };
  if (account.gmUnlocked || can(account.role, 'role.assign')) return { ok: true };
  return { ok: false, reason: 'Сначала служебный вход' };
}
