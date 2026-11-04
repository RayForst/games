import type { Check } from './character';
import { generateOpponent } from './opponents';
import type { Character, FightStatus, Opponent } from './types';

// Гильдии. Сервера нет, поэтому гильдия игрока живёт в его сейве, а соседи по таблице — гильдии
// местных (NPC): у них есть состав, казна и рейтинг, они растут по дням, с ними можно устраивать стычки.
// Когда появится сервер, структура Guild останется той же, просто members пополнятся живыми людьми.

export type GuildRank = 'leader' | 'officer' | 'member';

export const RANK_LABELS: Record<GuildRank, string> = {
  leader: 'Глава',
  officer: 'Десятник',
  member: 'Боец',
};

export interface GuildMember {
  id: string;
  name: string;
  rank: GuildRank;
  level: number;
  joinedAt: number;
  /** Это игрок. */
  player?: boolean;
  /** Именной соперник с арены (см. rivals.ts). */
  rivalId?: string;
}

export interface GuildEvent {
  at: number;
  text: string;
}

export type GuildEmblem = 'crown' | 'wolf' | 'boar' | 'skull' | 'fist' | 'raven' | 'dagger' | 'flame';

export const GUILD_EMBLEMS: { id: GuildEmblem; name: string }[] = [
  { id: 'crown', name: 'Корона' },
  { id: 'wolf', name: 'Волк' },
  { id: 'boar', name: 'Вепрь' },
  { id: 'skull', name: 'Череп' },
  { id: 'fist', name: 'Кулак' },
  { id: 'raven', name: 'Ворон' },
  { id: 'dagger', name: 'Кинжал' },
  { id: 'flame', name: 'Пламя' },
];

export interface Guild {
  id: string;
  name: string;
  /** 2–4 заглавные буквы, показывается перед именем: [ПСЫ] Толян. */
  tag: string;
  emblem: GuildEmblem;
  motto: string;
  level: number;
  treasury: number;
  /** Слава: растёт от побед членов и стычек, по ней таблица. */
  rating: number;
  members: GuildMember[];
  createdAt: number;
  log: GuildEvent[];
  /** Гильдия местных, не игрока. */
  npc?: boolean;
  /** День последнего дневного пересчёта (взносы, дрейф рейтинга). */
  lastDay: string | null;
}

export const GUILD_FOUND_COST = 250;
export const GUILD_MIN_LEVEL = 3;
export const GUILD_MAX_LEVEL = 5;
export const GUILD_LOG_LIMIT = 30;
export const GUILD_NAME_LEN: [number, number] = [3, 18];
export const GUILD_TAG_LEN: [number, number] = [2, 4];

export function normalizeTag(tag: string): string {
  return tag.trim().toUpperCase();
}

export function validateGuildName(name: string, taken: string[] = []): Check {
  const n = name.replace(/\s+/g, ' ').trim();
  if (n.length < GUILD_NAME_LEN[0]) return { ok: false, reason: `Название от ${GUILD_NAME_LEN[0]} букв` };
  if (n.length > GUILD_NAME_LEN[1]) return { ok: false, reason: `Название до ${GUILD_NAME_LEN[1]} букв` };
  if (!/^[а-яёa-z0-9 \-'«»]+$/i.test(n)) return { ok: false, reason: 'Только буквы, цифры, пробел и дефис' };
  if (taken.some((t) => t.toLowerCase() === n.toLowerCase())) return { ok: false, reason: 'Такая гильдия уже есть' };
  return { ok: true };
}

export function validateGuildTag(tag: string, taken: string[] = []): Check {
  const t = normalizeTag(tag);
  if (t.length < GUILD_TAG_LEN[0] || t.length > GUILD_TAG_LEN[1]) return { ok: false, reason: `Тег: ${GUILD_TAG_LEN[0]}–${GUILD_TAG_LEN[1]} буквы` };
  if (!/^[А-ЯЁA-Z]+$/.test(t)) return { ok: false, reason: 'Тег — только буквы' };
  if (taken.some((x) => normalizeTag(x) === t)) return { ok: false, reason: 'Тег занят' };
  return { ok: true };
}

/** Цена следующего уровня из казны: 400, 900, 1600, 2500. */
export function guildLevelCost(level: number): number {
  return 100 * (level + 1) ** 2;
}

export interface GuildPerks {
  expMult: number;
  kreditsMult: number;
  maxMembers: number;
}

const PERKS: Record<number, GuildPerks> = {
  1: { expMult: 1, kreditsMult: 1, maxMembers: 5 },
  2: { expMult: 1.03, kreditsMult: 1, maxMembers: 7 },
  3: { expMult: 1.05, kreditsMult: 1.03, maxMembers: 9 },
  4: { expMult: 1.08, kreditsMult: 1.05, maxMembers: 12 },
  5: { expMult: 1.1, kreditsMult: 1.08, maxMembers: 15 },
};

export function guildPerks(level: number): GuildPerks {
  return PERKS[Math.min(GUILD_MAX_LEVEL, Math.max(1, level))];
}

/** Накрыть стол соперника, чтобы он вступил. */
export function recruitCost(level: number): number {
  return 60 + 25 * Math.max(0, level);
}

/** Именного соперника можно звать после двух побед над ним: иначе он тебя не уважает. */
export const RECRUIT_WINS = 2;

export function canRecruitRival(c: Character, rivalId: string): Check {
  const rec = c.rivals[rivalId] ?? { wins: 0, losses: 0 };
  if (rec.wins < RECRUIT_WINS) return { ok: false, reason: `Нужно ${RECRUIT_WINS} победы над ним, есть ${rec.wins}` };
  return { ok: true };
}

export function canFoundGuild(c: Character): Check {
  if (c.level < GUILD_MIN_LEVEL) return { ok: false, reason: `С ${GUILD_MIN_LEVEL} уровня` };
  if (c.kredits < GUILD_FOUND_COST) return { ok: false, reason: `Нужно ${GUILD_FOUND_COST} кр.` };
  return { ok: true };
}

/** В гильдию местных берут по рейтингу и уровню: чем старше гильдия, тем строже. */
export function joinCheck(c: Character, g: Guild): Check {
  const needRating = g.level * 20;
  if (c.level < g.level) return { ok: false, reason: `Берут с ${g.level} уровня` };
  if (c.rating < needRating) return { ok: false, reason: `Нужен рейтинг ${needRating}, у тебя ${c.rating}` };
  if (g.members.length >= guildPerks(g.level).maxMembers) return { ok: false, reason: 'Мест нет' };
  return { ok: true };
}

export function addGuildEvent(g: Guild, text: string, now = Date.now()): Guild {
  const log = [...g.log, { at: now, text }];
  return { ...g, log: log.length > GUILD_LOG_LIMIT ? log.slice(log.length - GUILD_LOG_LIMIT) : log };
}

export interface FoundArgs {
  id: string;
  name: string;
  tag: string;
  emblem: GuildEmblem;
  motto?: string;
  founder: { id: string; name: string; level: number };
  now?: number;
}

export function newGuild({ id, name, tag, emblem, motto = '', founder, now = Date.now() }: FoundArgs): Guild {
  const g: Guild = {
    id,
    name: name.replace(/\s+/g, ' ').trim(),
    tag: normalizeTag(tag),
    emblem,
    motto: motto.trim(),
    level: 1,
    treasury: 0,
    rating: 0,
    members: [{ id: founder.id, name: founder.name, rank: 'leader', level: founder.level, joinedAt: now, player: true }],
    createdAt: now,
    log: [],
    lastDay: null,
  };
  return addGuildEvent(g, `${founder.name} основал гильдию.`, now);
}

export function playerMember(g: Guild): GuildMember | undefined {
  return g.members.find((m) => m.player);
}

export function isLeader(g: Guild): boolean {
  return playerMember(g)?.rank === 'leader';
}

export function canManage(g: Guild): boolean {
  const me = playerMember(g);
  return me?.rank === 'leader' || me?.rank === 'officer';
}

export function addMember(g: Guild, m: Omit<GuildMember, 'rank' | 'joinedAt'>, now = Date.now()): { ok: boolean; reason?: string; guild: Guild } {
  if (g.members.length >= guildPerks(g.level).maxMembers) return { ok: false, reason: `Мест нет: ${guildPerks(g.level).maxMembers} на этом уровне`, guild: g };
  if (g.members.some((x) => x.id === m.id)) return { ok: false, reason: 'Уже в гильдии', guild: g };
  const guild = addGuildEvent({ ...g, members: [...g.members, { ...m, rank: 'member', joinedAt: now }] }, `${m.name} вступил.`, now);
  return { ok: true, guild };
}

export function removeMember(g: Guild, memberId: string, reason: 'kick' | 'leave', now = Date.now()): { ok: boolean; reason?: string; guild: Guild } {
  const m = g.members.find((x) => x.id === memberId);
  if (!m) return { ok: false, reason: 'Такого нет', guild: g };
  if (m.rank === 'leader' && reason === 'kick') return { ok: false, reason: 'Главу не выгоняют', guild: g };
  const guild = addGuildEvent({ ...g, members: g.members.filter((x) => x.id !== memberId) }, reason === 'kick' ? `${m.name} выгнан.` : `${m.name} ушёл.`, now);
  return { ok: true, guild };
}

export function setRank(g: Guild, memberId: string, rank: GuildRank, now = Date.now()): { ok: boolean; reason?: string; guild: Guild } {
  const m = g.members.find((x) => x.id === memberId);
  if (!m) return { ok: false, reason: 'Такого нет', guild: g };
  if (m.rank === 'leader') return { ok: false, reason: 'Глава один', guild: g };
  if (rank === 'leader') return { ok: false, reason: 'Главу не назначают, глава основал', guild: g };
  if (m.rank === rank) return { ok: false, reason: 'Уже', guild: g };
  const guild = addGuildEvent({ ...g, members: g.members.map((x) => (x.id === memberId ? { ...x, rank } : x)) }, `${m.name} теперь ${RANK_LABELS[rank].toLowerCase()}.`, now);
  return { ok: true, guild };
}

/** Слава за бой члена гильдии: стычки весят больше. */
export function guildRatingDelta(status: FightStatus, skirmish = false): number {
  const base = status === 'won' ? 5 : status === 'draw' ? 1 : -3;
  return skirmish ? base * 4 : base;
}

/** Приз за стычку: в казну и бойцу. */
export function skirmishPrize(status: FightStatus, enemyGuildLevel: number): { treasury: number; kredits: number } {
  if (status === 'won') return { treasury: 30 + 20 * enemyGuildLevel, kredits: 20 + 10 * enemyGuildLevel };
  if (status === 'draw') return { treasury: 10, kredits: 5 };
  return { treasury: 0, kredits: 0 };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Боец чужой гильдии для стычки: тот, кто по уровню ближе к игроку (при равных — случайный). */
export function skirmishOpponent(g: Guild, playerLevel: number, rng: () => number): Opponent {
  const sorted = [...g.members].sort((a, b) => Math.abs(a.level - playerLevel) - Math.abs(b.level - playerLevel));
  const closest = sorted.filter((m) => Math.abs(m.level - playerLevel) === Math.abs(sorted[0].level - playerLevel));
  const m = pick(rng, closest);
  const base = generateOpponent(m.level, rng, new Set(), 0.7);
  return { ...base, id: `guild:${g.id}:${m.id}`, name: m.name, flavor: `[${g.tag}] ${RANK_LABELS[m.rank]} гильдии «${g.name}».` };
}

const npcMember = (id: string, name: string, level: number, rank: GuildRank = 'member'): GuildMember => ({ id: `npc:${id}`, name, rank, level, joinedAt: 0 });

/** Гильдии местных. Живут в сейве: растут, копят, дрейфуют по таблице. */
export const NPC_GUILDS: Guild[] = [
  {
    id: 'dogs',
    name: 'Чёрные Псы',
    tag: 'ПСЫ',
    emblem: 'wolf',
    motto: 'Кто не с нами — тот корм.',
    level: 2,
    treasury: 600,
    rating: 160,
    members: [npcMember('syava', 'Кабан Сява', 4, 'leader'), npcMember('stepan', 'Рыжий Степан', 3, 'officer'), npcMember('lyokha', 'Кривой Лёха', 2), npcMember('efim', 'Палач Ефим', 4)],
    createdAt: 0,
    log: [],
    npc: true,
    lastDay: null,
  },
  {
    id: 'guildhall',
    name: 'Цех',
    tag: 'ЦЕХ',
    emblem: 'boar',
    motto: 'Молот, тесак, расчёт.',
    level: 3,
    treasury: 1800,
    rating: 340,
    members: [npcMember('molot', 'Молот', 6, 'leader'), npcMember('prokhor', 'Дядя Прохор', 5, 'officer'), npcMember('zhila', 'Жила', 4), npcMember('rzhavy', 'Ржавый', 3), npcMember('tesak', 'Тесак', 5)],
    createdAt: 0,
    log: [],
    npc: true,
    lastDay: null,
  },
  {
    id: 'quiet',
    name: 'Тихие',
    tag: 'ТИХ',
    emblem: 'dagger',
    motto: '…',
    level: 1,
    treasury: 150,
    rating: 80,
    members: [npcMember('shepot', 'Шёпот', 3, 'leader'), npcMember('bely', 'Белый', 2), npcMember('igla', 'Игла', 2)],
    createdAt: 0,
    log: [],
    npc: true,
    lastDay: null,
  },
];

export function normalizeGuilds(raw: Guild[] | null | undefined): Guild[] {
  if (!Array.isArray(raw) || raw.length === 0) return NPC_GUILDS.map((g) => ({ ...g, members: [...g.members], log: [...g.log] }));
  // Новые гильдии местных дописываем старым сейвам.
  const ids = new Set(raw.map((g) => g.id));
  return [...raw.map((g) => ({ ...g, log: g.log ?? [], lastDay: g.lastDay ?? null })), ...NPC_GUILDS.filter((g) => !ids.has(g.id))];
}

/** Таблица: все гильдии по славе. */
export function guildLadder(player: Guild | null, npc: Guild[]): Guild[] {
  const all = player ? [player, ...npc.filter((g) => g.id !== player.id)] : [...npc];
  return all.sort((a, b) => b.rating - a.rating || a.createdAt - b.createdAt);
}

export function ladderPlace(player: Guild, npc: Guild[]): number {
  return guildLadder(player, npc).findIndex((g) => g.id === player.id) + 1;
}

/** Взнос местных членов в казну за день: по 3 кр. за уровень. */
export function dailyContribution(g: Guild): number {
  return g.members.filter((m) => !m.player).reduce((sum, m) => sum + m.level * 3, 0);
}

/** Дневной пересчёт: взносы местных, у гильдий местных ещё дрейф славы. Идемпотентно в пределах дня. */
export function dailyGuildUpdate(g: Guild, day: string, rng: () => number, now = Date.now()): Guild {
  if (g.lastDay === day) return g;
  const contribution = dailyContribution(g);
  let next: Guild = { ...g, lastDay: day, treasury: g.treasury + contribution };
  if (g.npc) {
    const drift = Math.round((rng() - 0.4) * 24);
    next = { ...next, rating: Math.max(0, next.rating + drift) };
    // Местные поднимают уровень, когда казна позволяет, но не выше 4-го: пусть игроку есть куда расти.
    if (next.level < 4 && next.treasury >= guildLevelCost(next.level) * 2) {
      next = { ...next, treasury: next.treasury - guildLevelCost(next.level), level: next.level + 1 };
    }
    return next;
  }
  if (contribution > 0) next = addGuildEvent(next, `Взносы бойцов: +${contribution} кр. в казну.`, now);
  return next;
}

export function canUpgradeGuild(g: Guild): Check {
  if (g.level >= GUILD_MAX_LEVEL) return { ok: false, reason: 'Выше некуда' };
  const cost = guildLevelCost(g.level);
  if (g.treasury < cost) return { ok: false, reason: `В казне нужно ${cost} кр., есть ${g.treasury}` };
  return { ok: true };
}

/** Имя с тегом: [ПСЫ] Толян. */
export function taggedName(name: string, tag: string | null | undefined): string {
  return tag ? `[${tag}] ${name}` : name;
}
