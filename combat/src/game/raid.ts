import type { FightStatus, Opponent } from './types';
import { generateOpponent } from './opponents';
import { otherSide, SIDES_BY_ID, type SideId } from './races';
import type { Guild } from './guild';
import { WAR_PLAYER_POINTS } from './war';
import { TOWNS_BY_ID } from './towns';
import type { TownId } from './world';

// Рейд: с нижнего яруса склепа выход в столицу чужой стороны. Три боя подряд против её «игроков»
// (пока местные с тегами чужих гильдий, с сервером станут живые), здоровье между боями не лечат.
// За каждый бой — очки войны сторон вдвое против обычного, слава гильдии и добыча. Раз в день.
// Чужая сторона тоже ходит: раз в день на тике — новость и очки ей; застала тебя дома — можно отбиться.

export const RAID_FIGHTS = 3;
/** Очков войны за победу в рейде (обычный бой с чужой стороной — `WAR_PLAYER_POINTS`). */
export const RAID_WAR_POINTS = 6;
/** Сколько добавить сверх обычных очков боя с чужой стороной. */
export const RAID_WAR_EXTRA = RAID_WAR_POINTS - WAR_PLAYER_POINTS;
/** Славы гильдии за победу в рейде сверх обычной. */
export const RAID_GUILD_RATING = 6;
export const RAID_TITLE = 'Налётчик';
export const DEFENDER_TITLE = 'Привратник';

export type RaidStatus = 'active' | 'won' | 'lost';

export interface Raid {
  day: string;
  /** Куда ворвались. */
  target: TownId;
  /** Чья это столица. */
  side: SideId;
  /** Боёв проведено. */
  stage: number;
  /** Из них выиграно. */
  kills: number;
  status: RaidStatus;
  /** Добыча за рейд, кредитов. */
  loot: number;
}

/** Ответный рейд чужих, который застал тебя в своём городе: один бой на воротах. */
export interface Defense {
  day: string;
  town: TownId;
  side: SideId;
  opponent: Opponent;
}

/** Журнал рейдов: лимит в день, ответные рейды, счёт. */
export interface RaidLog {
  /** День последнего своего рейда. */
  lastDay: string | null;
  /** День последнего ответного рейда чужих. */
  enemyDay: string | null;
  /** Полных рейдов (три победы). */
  won: number;
  /** Отбитых налётов. */
  defended: number;
  defense: Defense | null;
}

export function newRaidLog(): RaidLog {
  return { lastDay: null, enemyDay: null, won: 0, defended: 0, defense: null };
}

export function normalizeRaidLog(raw: Partial<RaidLog> | null | undefined): RaidLog {
  const base = newRaidLog();
  if (!raw) return base;
  return {
    lastDay: typeof raw.lastDay === 'string' ? raw.lastDay : null,
    enemyDay: typeof raw.enemyDay === 'string' ? raw.enemyDay : null,
    won: typeof raw.won === 'number' ? raw.won : 0,
    defended: typeof raw.defended === 'number' ? raw.defended : 0,
    defense: raw.defense && raw.defense.opponent ? raw.defense : null,
  };
}

/** Столица, куда ведёт нижний ход: главная столица чужой стороны. */
export function raidTarget(side: SideId): TownId {
  return SIDES_BY_ID[otherSide(side)].capital;
}

export function newRaid(day: string, side: SideId): Raid {
  return { day, target: raidTarget(side), side: otherSide(side), stage: 0, kills: 0, status: 'active', loot: 0 };
}

export interface RaidCheck {
  ok: boolean;
  reason?: string;
}

/** Можно ли выйти наверх: склеп пройден, сегодня ещё не ходил, рейда нет. */
export function canStartRaid(opts: { cleared: boolean; log: RaidLog; day: string; raid: Raid | null; hp: number }): RaidCheck {
  if (opts.raid && opts.raid.status === 'active' && opts.raid.day === opts.day) return { ok: false, reason: 'Рейд уже идёт' };
  if (!opts.cleared) return { ok: false, reason: 'Сначала пройди склеп до нижнего хода' };
  if (opts.log.lastDay === opts.day) return { ok: false, reason: 'Сегодня уже ходил. Чужие ворота запомнили, приходи завтра.' };
  if (opts.hp < 1) return { ok: false, reason: 'Нет сил. Наверху не лечат.' };
  return { ok: true };
}

const RAID_FLAVORS = [
  'Не ждал гостей из-под земли. Теперь ждёт, когда ты ляжешь.',
  'Пил в кабаке, услышал шум. Вышел с тем, что было в руке.',
  'Местный боец. Своих не сдаёт, чужих не щадит.',
  'Стоял на воротах. Ворота за твоей спиной, он — перед.',
  'Из тех, кто ходил в рейд к вам. Долг платежом красен.',
];

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * «Игрок» чужой стороны: бот около твоего уровня, одет по уровню, с тегом одной из гильдий своей стороны.
 * Сторона — чужая, так что бой идёт в войну сторон.
 */
export function raidOpponent(enemy: SideId, playerLevel: number, guilds: Guild[], rng: () => number, used: Set<string> = new Set()): Opponent {
  const level = Math.max(0, playerLevel + [-1, 0, 0, 1][Math.floor(rng() * 4)]);
  const base = generateOpponent(level, rng, used, 1, undefined, { side: enemy });
  const own = guilds.filter((g) => g.side === enemy);
  const guild = own.length > 0 ? pick(rng, own) : null;
  return {
    ...base,
    id: `raid:${base.id}`,
    name: guild ? `[${guild.tag}] ${base.name}` : base.name,
    flavor: `${guild ? `Боец «${guild.name}». ` : ''}${pick(rng, RAID_FLAVORS)}`,
    side: enemy,
  };
}

/** Добыча за победу в рейде, кредитов. */
export function raidLoot(level: number): number {
  return 20 + 12 * level;
}

/** Итог боя рейда: победа — шаг дальше, поражение — рейд окончен, три победы — полный. */
export function raidAfterFight(r: Raid, status: FightStatus, loot: number): Raid {
  if (r.status !== 'active') return r;
  const stage = r.stage + 1;
  if (status !== 'won') return { ...r, stage, status: 'lost' };
  const kills = r.kills + 1;
  return { ...r, stage, kills, loot: r.loot + loot, status: kills >= RAID_FIGHTS ? 'won' : 'active' };
}

const COUNT = ['никого', 'одного', 'двоих', 'троих'];

/** Сводка своего рейда для чата: «Вольница ворвалась в Город: Вася уложил троих». */
export function raidNews(name: string, side: SideId, target: TownId, kills: number, status: RaidStatus): string {
  const where = TOWNS_BY_ID[target].name;
  const who = SIDES_BY_ID[side].name;
  const laid = COUNT[Math.max(0, Math.min(3, kills))];
  if (status === 'won') return `${who} ворвалась в ${where}: ${name} уложил ${laid} и ушёл под землю. Полный рейд.`;
  if (kills === 0) return `${who} сунулась в ${where} через склеп: ${name} лёг у первых же ворот.`;
  return `${who} ворвалась в ${where}: ${name} уложил ${laid}, потом его вынесли обратно в склеп.`;
}

/** Ответный рейд чужих: кто, куда, скольких. */
export interface EnemyRaid {
  side: SideId;
  town: TownId;
  raider: string;
  kills: number;
  /** Очков войны стороне налётчика. */
  points: number;
}

/**
 * Раз в день чужая сторона ходит сама. Час налёта на день фиксированный (от даты), чтобы не стрелял
 * ровно в полночь и не повторялся по два раза.
 */
export function enemyRaidDueAt(day: string, now: number): number {
  let h = 2166136261;
  for (const ch of day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const hour = 8 + (h % 14); // с 8 до 21 по часам телефона
  const d = new Date(now);
  d.setHours(hour, (h >>> 8) % 60, 0, 0);
  return d.getTime();
}

export function rollEnemyRaid(mine: SideId, playerLevel: number, guilds: Guild[], rng: () => number): EnemyRaid {
  const side = otherSide(mine);
  const town = SIDES_BY_ID[mine].capital;
  const kills = 1 + Math.floor(rng() * RAID_FIGHTS);
  const raider = raidOpponent(side, playerLevel, guilds, rng).name;
  return { side, town, raider, kills, points: kills * RAID_WAR_POINTS };
}

export function enemyRaidNews(e: EnemyRaid): string {
  const where = TOWNS_BY_ID[e.town].name;
  return `${SIDES_BY_ID[e.side].name} ворвалась в ${where} через склеп: ${e.raider} уложил ${COUNT[Math.min(3, e.kills)]} и ушёл. +${e.points} очков ${SIDES_BY_ID[e.side].dative}.`;
}

/** Та же вылазка, но ты оказался дома: налётчик у ворот, можно отбиться. */
export function defenseNews(e: EnemyRaid): string {
  return `${SIDES_BY_ID[e.side].name} ломится в ${TOWNS_BY_ID[e.town].name} через склеп: ${e.raider} у ворот. Ты дома — можешь отбиться.`;
}
