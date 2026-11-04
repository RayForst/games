import type { DerivedStats, Opponent, StatKey } from './types';
import { generateOpponent } from './opponents';
import { deriveStats } from './formulas';

// Лес: сбор ресурсов по времени (как шахта), рынок с дневными ценами, засады.

export type ResourceId = 'herbs' | 'wood' | 'pelts';

export interface ResourceDef {
  id: ResourceId;
  name: string;
  /** Базовая цена скупки за штуку. */
  basePrice: number;
  icon: 'herbs' | 'wood' | 'pelts';
}

export const RESOURCES: ResourceDef[] = [
  { id: 'herbs', name: 'Травы', basePrice: 3, icon: 'herbs' },
  { id: 'wood', name: 'Дрова', basePrice: 4, icon: 'wood' },
  { id: 'pelts', name: 'Шкуры', basePrice: 7, icon: 'pelts' },
];

export const RESOURCES_BY_ID = Object.fromEntries(RESOURCES.map((r) => [r.id, r])) as Record<ResourceId, ResourceDef>;

export type Resources = Record<ResourceId, number>;

export function emptyResources(): Resources {
  return { herbs: 0, wood: 0, pelts: 0 };
}

export function normalizeResources(raw?: Partial<Resources> | null): Resources {
  return { ...emptyResources(), ...(raw ?? {}) };
}

export type ActivityId = 'herbs' | 'chop' | 'hunt';

export interface ActivityDef {
  id: ActivityId;
  name: string;
  resource: ResourceId;
  stat: StatKey;
  /** Штук в час без учёта характеристики. */
  base: number;
  icon: 'herbs' | 'chop' | 'hunt';
  flavor: string;
}

export const ACTIVITIES: ActivityDef[] = [
  { id: 'herbs', name: 'Собирать травы', resource: 'herbs', stat: 'dexterity', base: 6, icon: 'herbs', flavor: 'Ловкие пальцы — полная сумка.' },
  { id: 'chop', name: 'Рубить дрова', resource: 'wood', stat: 'strength', base: 5, icon: 'chop', flavor: 'Сила решает, сколько поленьев к вечеру.' },
  { id: 'hunt', name: 'Охотиться', resource: 'pelts', stat: 'intuition', base: 3, icon: 'hunt', flavor: 'Чутьё ведёт к зверю, а не зверя к тебе.' },
];

export const ACTIVITIES_BY_ID = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a])) as Record<ActivityId, ActivityDef>;

export const GATHER_MINUTES = [15, 30, 60] as const;
export type GatherMinutes = (typeof GATHER_MINUTES)[number];

export function isGatherMinutes(m: number): m is GatherMinutes {
  return (GATHER_MINUTES as readonly number[]).includes(m);
}

export interface Gathering {
  activity: ActivityId;
  startedAt: number;
  minutes: number;
}

const MINUTE_MS = 60_000;

/** Штук в час: база занятия плюс половина профильной характеристики. */
export function gatherRatePerHour(activity: ActivityId, derived: DerivedStats): number {
  const a = ACTIVITIES_BY_ID[activity];
  return a.base + Math.floor(derived.stats[a.stat] / 2);
}

export function gatherElapsedMs(g: Gathering, now: number): number {
  return Math.max(0, Math.min(now - g.startedAt, g.minutes * MINUTE_MS));
}

export function gatherDone(g: Gathering, now: number): boolean {
  return now - g.startedAt >= g.minutes * MINUTE_MS;
}

export function gatherProgress(g: Gathering, now: number): number {
  return gatherElapsedMs(g, now) / (g.minutes * MINUTE_MS);
}

export function gatherSecondsLeft(g: Gathering, now: number): number {
  return Math.max(0, Math.ceil((g.startedAt + g.minutes * MINUTE_MS - now) / 1000));
}

/** Сколько набрал к моменту `now`, целые штуки. */
export function gatherYield(g: Gathering, ratePerHour: number, now: number): number {
  return Math.floor((ratePerHour * gatherElapsedMs(g, now)) / (60 * MINUTE_MS));
}

// ─── Рынок ──────────────────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Цена скупки на день: база × 0.7…1.3, одинаковая весь день. */
export function marketPrice(resource: ResourceId, day: string): number {
  const mult = 0.7 + ((hash(`${day}:${resource}`) % 61) / 100) ;
  return Math.max(1, Math.round(RESOURCES_BY_ID[resource].basePrice * mult));
}

// ─── Засада ─────────────────────────────────────────────────────────────────

export const AMBUSH_CHANCE = 0.25;

export function rollAmbush(rng: () => number): boolean {
  return rng() < AMBUSH_CHANCE;
}

const FOES: { name: string; flavor: string; beast: boolean }[] = [
  { name: 'Волк', flavor: 'Тощий и злой. Таких тут стая.', beast: true },
  { name: 'Матёрый волк', flavor: 'Седой загривок, шрам через морду.', beast: true },
  { name: 'Кабан', flavor: 'Бьёт как таран, а бежит быстрее тебя.', beast: true },
  { name: 'Разбойник', flavor: 'Хотел твою сумку. Теперь хочет твою голову.', beast: false },
  { name: 'Браконьер', flavor: 'Ты на его делянке. Он не рад.', beast: false },
];

/** Лесной противник уровня игрока. Зверь без вещей, человек — как обычный бот. */
export function forestOpponent(level: number, rng: () => number): Opponent {
  const foe = FOES[Math.floor(rng() * FOES.length)];
  const base = generateOpponent(level, rng, new Set(), foe.beast ? 0 : 0.6);
  const itemIds = foe.beast ? [] : base.itemIds;
  return {
    ...base,
    name: foe.name,
    flavor: foe.flavor,
    itemIds,
    derived: deriveStats(base.stats, base.level, itemIds),
  };
}

/** Исход засады для улова: победа +25 %, поражение или ничья −50 %. */
export function haulAfterAmbush(amount: number, won: boolean): number {
  return won ? Math.ceil(amount * 1.25) : Math.floor(amount / 2);
}
