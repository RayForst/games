import type { FightStatus, Character, Injury } from './types';
import type { SideId } from './races';
import { cureCost, healPrice } from './character';
import { marketPrice, type ResourceId } from './wilds';
import { dayKey } from './quests';
import type { ChestKind } from './chests';

// События княжества: календарь по дням, каждое идёт несколько дней и крутит множители,
// которые читают существующие формулы (рынок, лекарь, арена, засады, дорога, трофеи).
// Календарь детерминирован по дате: без сервера у всех игроков один и тот же день.

export type EventId = 'fair' | 'plague' | 'hunt' | 'guard' | 'thieves';

export interface EventMults {
  /** Скупка в лавке и на рынке Брода. */
  market: number;
  /** Отдельная надбавка на шкуры. */
  pelts: number;
  /** Зелья и вправление травм у лекаря. */
  heal: number;
  /** Травмы чаще: второй бросок, если первый прошёл мимо. */
  injuryExtraRoll: boolean;
  /** Добавка к шансу засады в диких землях. */
  ambushBonus: number;
  /** Кредиты за победу на арене над Вольницей. */
  arenaVsFree: number;
  /** Шанс потерять долю кошеля по дороге между локациями. */
  roadLossChance: number;
  /** Множитель шанса трофея с побеждённого. */
  lootMult: number;
  /** Множитель шанса сундука после боя. */
  chestMult: number;
  /** Сундук в довесок к дневной награде. */
  dailyChest: ChestKind | null;
}

export const NEUTRAL_MULTS: EventMults = {
  market: 1,
  pelts: 1,
  heal: 1,
  injuryExtraRoll: false,
  ambushBonus: 0,
  arenaVsFree: 1,
  roadLossChance: 0,
  lootMult: 1,
  chestMult: 1,
  dailyChest: null,
};

export interface EventDef {
  id: EventId;
  name: string;
  /** Сколько дней идёт. */
  days: number;
  /** Баннер в тоне лора. */
  banner: string;
  /** Что меняется — короткими строками для экрана. */
  effects: string[];
  mults: Partial<EventMults>;
}

export const EVENTS: EventDef[] = [
  {
    id: 'fair',
    name: 'Ярмарка',
    days: 3,
    banner: 'На площади телеги в три ряда, купцы из-за реки берут всё подряд и платят, не торгуясь. Карманников тоже втрое.',
    effects: ['Лавка и рынок Брода скупают на треть дороже', 'К дневной награде — деревянный сундук'],
    mults: { market: 1.3, dailyChest: 'wooden' },
  },
  {
    id: 'hunt',
    name: 'Княжья охота',
    days: 3,
    banner: 'Князь с псарней ушёл в леса. Зверь поднят и бежит на тропы, а скорняки платят за шкуры как за серебро.',
    effects: ['Шкуры вдвое дороже', 'Засады в диких землях чаще'],
    mults: { pelts: 2, ambushBonus: 0.2 },
  },
  {
    id: 'guard',
    name: 'Набор в стражу',
    days: 3,
    banner: 'Сотник набирает людей и смотрит, кто как бьёт вольных. За битого вольного Хозяин кладёт сверху из княжьей казны.',
    effects: ['Победа над Вольницей на арене — кредиты ×1.5'],
    mults: { arenaVsFree: 1.5 },
  },
  {
    id: 'plague',
    name: 'Чума',
    days: 3,
    banner: 'На окраине заколотили два дома. Лекарь жжёт полынь и берёт вдвое: говорит, за риск. Раны гниют быстрее обычного.',
    effects: ['Лекарь вдвое дороже', 'Травмы после поражений чаще'],
    mults: { heal: 2, injuryExtraRoll: true },
  },
  {
    id: 'thieves',
    name: 'Ночь воров',
    days: 2,
    banner: 'Стража пьёт, фонари не горят. На дорогах режут кошели, зато с битых снимают всё до исподнего.',
    effects: ['В дороге можно потерять десятую часть кошеля', 'Трофеи с побеждённых вдвое чаще, сундуки — тоже'],
    mults: { roadLossChance: 0.35, lootMult: 2, chestMult: 2 },
  },
];

export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e])) as Record<EventId, EventDef>;

/** Календарь: события с промежутками, по кругу. Начало отсчёта — понедельник 2 ноября 2026. */
export const CALENDAR_EPOCH = '2026-11-02';

export const CALENDAR: { id: EventId | null; days: number }[] = [
  { id: 'fair', days: 3 },
  { id: null, days: 2 },
  { id: 'hunt', days: 3 },
  { id: null, days: 2 },
  { id: 'guard', days: 3 },
  { id: null, days: 2 },
  { id: 'plague', days: 3 },
  { id: null, days: 2 },
  { id: 'thieves', days: 2 },
  { id: null, days: 3 },
];

export const CALENDAR_LENGTH = CALENDAR.reduce((s, x) => s + x.days, 0);

/** Номер дня от начала эпохи по ключу YYYY-MM-DD (локальная дата, без часовых поясов). */
export function dayIndex(day: string): number {
  const [y, m, d] = day.split('-').map((x) => Number(x));
  if (!y || !m || !d) return 0;
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Ключ дня, сдвинутый на `delta` дней. */
export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map((x) => Number(x));
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  const mm = (t.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = t.getUTCDate().toString().padStart(2, '0');
  return `${t.getUTCFullYear()}-${mm}-${dd}`;
}

/** Разница в днях между ключами: `b` минус `a`. */
export function daysBetween(a: string, b: string): number {
  return dayIndex(b) - dayIndex(a);
}

export interface ActiveEvent {
  def: EventDef;
  /** Который день события идёт, с единицы. */
  dayOf: number;
  /** Сколько дней осталось, считая сегодняшний. */
  daysLeft: number;
}

function slotAt(day: string): { slot: (typeof CALENDAR)[number]; offset: number; index: number } {
  const n = dayIndex(day) - dayIndex(CALENDAR_EPOCH);
  let pos = ((n % CALENDAR_LENGTH) + CALENDAR_LENGTH) % CALENDAR_LENGTH;
  for (let i = 0; i < CALENDAR.length; i++) {
    const slot = CALENDAR[i];
    if (pos < slot.days) return { slot, offset: pos, index: i };
    pos -= slot.days;
  }
  return { slot: CALENDAR[0], offset: 0, index: 0 };
}

/** Событие, идущее в день `day`, или null в тихие дни. */
export function activeEvent(day: string = dayKey()): ActiveEvent | null {
  const { slot, offset } = slotAt(day);
  if (!slot.id) return null;
  const def = EVENTS_BY_ID[slot.id];
  return { def, dayOf: offset + 1, daysLeft: slot.days - offset };
}

/** Ближайшее следующее событие и через сколько дней оно начнётся (0 — уже идёт). */
export function nextEvent(day: string = dayKey()): { def: EventDef; inDays: number } {
  const { slot, offset, index } = slotAt(day);
  if (slot.id) return { def: EVENTS_BY_ID[slot.id], inDays: 0 };
  let inDays = slot.days - offset;
  for (let k = 1; k <= CALENDAR.length; k++) {
    const s = CALENDAR[(index + k) % CALENDAR.length];
    if (s.id) return { def: EVENTS_BY_ID[s.id], inDays };
    inDays += s.days;
  }
  return { def: EVENTS[0], inDays };
}

/** Множители дня: нейтральные, если событий нет. */
export function eventMults(day: string = dayKey()): EventMults {
  const ev = activeEvent(day);
  return ev ? { ...NEUTRAL_MULTS, ...ev.def.mults } : NEUTRAL_MULTS;
}

/** Календарь на ближайшие дни для экрана: идущее событие (с отрицательным `startsIn`) и следующие. */
export function upcomingEvents(day: string = dayKey(), horizon = 14): { def: EventDef; startsIn: number; days: number }[] {
  const out: { def: EventDef; startsIn: number; days: number }[] = [];
  let i = 0;
  while (i <= horizon) {
    const ev = activeEvent(shiftDay(day, i));
    if (!ev) {
      i += 1;
      continue;
    }
    out.push({ def: ev.def, startsIn: i - (ev.dayOf - 1), days: ev.def.days });
    i += ev.daysLeft;
  }
  return out;
}

// ─── Точки подключения к существующим формулам ─────────────────────────────

/** Цена скупки с поправкой события дня. */
export function marketPriceToday(resource: ResourceId, day: string = dayKey(), town: 'city' | 'brod' = 'city'): number {
  const m = eventMults(day);
  const mult = m.market * (resource === 'pelts' ? m.pelts : 1);
  return Math.max(1, Math.round(marketPrice(resource, day, town) * mult));
}

/** Цена зелья у лекаря с поправкой события дня (чума — вдвое). */
export function healPriceToday(c: Character, fraction: number, day: string = dayKey()): number {
  return Math.max(1, Math.ceil(healPrice(c, fraction) * eventMults(day).heal));
}

/** Цена вправления травмы с поправкой события дня. */
export function cureCostToday(c: Character, injury: Injury, day: string = dayKey()): number {
  return Math.max(1, Math.ceil(cureCost(c, injury) * eventMults(day).heal));
}

/** Множитель кредитов за бой на арене: набор в стражу платит за битых вольных. */
export function arenaEventMult(mine: SideId, enemy: SideId | null | undefined, status: FightStatus, day: string = dayKey()): number {
  if (status !== 'won' || !enemy || enemy === mine || enemy !== 'free') return 1;
  return eventMults(day).arenaVsFree;
}

/** Ночь воров: сколько кредитов срезали по дороге (0 — пронесло). */
export function roadLoss(kredits: number, rng: () => number, day: string = dayKey()): number {
  const chance = eventMults(day).roadLossChance;
  if (chance <= 0 || kredits <= 0 || rng() >= chance) return 0;
  return Math.max(1, Math.ceil(kredits * 0.1));
}

export const ROAD_LOSS_TEXTS = [
  'Ночь воров: кто-то шёл рядом, пока ты спал у костра. Кошель легче на {n} кр.',
  'Ночь воров: у брода попросили «на мост». Сзади стояли ещё трое. −{n} кр.',
  'Ночь воров: нож у рёбер, рука в кошеле, и всё без единого слова. −{n} кр.',
];

export function roadLossText(n: number, rng: () => number): string {
  return ROAD_LOSS_TEXTS[Math.floor(rng() * ROAD_LOSS_TEXTS.length)].replace('{n}', String(n));
}
