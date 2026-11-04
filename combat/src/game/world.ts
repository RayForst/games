import type { Character } from './types';

// Карта мира: локации и дороги между ними. Переход занимает реальное время, как шахта.

export type LocationId = 'city' | 'forest' | 'swamp' | 'ruins' | 'pass' | 'brod';

/** Города: арена, лавка/рынок, работа. */
export type TownId = 'city' | 'brod';

export function isTown(id: LocationId): id is TownId {
  return id === 'city' || id === 'brod';
}

export interface Location {
  id: LocationId;
  name: string;
  /** Точка на карте мира в долях ширины/высоты (0..1). */
  x: number;
  y: number;
  /** Иконка из GI (gi.generated). */
  icon: 'city' | 'forest' | 'swamp' | 'ruins' | 'pass' | 'town';
  /** С какого уровня персонажа дорога туда открыта. */
  minLevel: number;
  description: string;
}

export const LOCATIONS: Location[] = [
  {
    id: 'city',
    name: 'Город',
    x: 0.5,
    y: 0.56,
    icon: 'city',
    minLevel: 0,
    description:
      'Городок на холмах у реки, после войны и чумы. Одна улица: шахта, кузница Макара, ломбард с решётками, клуб с красными флагами, зелёный фонарь лекаря и пивная «У виселицы». За рекой — замок князя, который сюда не спускается.',
  },
  {
    id: 'forest',
    name: 'Лес',
    x: 0.2,
    y: 0.3,
    icon: 'forest',
    minLevel: 0,
    description:
      'Сосновый бор за рекой, две минуты от моста. Травы для лекаря, дрова для Макара, шкуры для лавки. Волки ходят стаей, кабаны — по одному, разбойники и браконьеры — за тобой. Засада на обратной тропе раз из четырёх.',
  },
  {
    id: 'swamp',
    name: 'Болото',
    x: 0.8,
    y: 0.28,
    icon: 'swamp',
    minLevel: 2,
    description:
      'Гнилые топи за восточной дорогой, туман до полудня. Растёт болотник, за который лекарь платит и снимает травмы; река приносит плавник. Из жижи вылезает всякое, по тропам ходят контрабандисты. Тут засада чаще, чем через раз, и враги на уровень злее.',
  },
  {
    id: 'pass',
    name: 'Перевал',
    x: 0.22,
    y: 0.84,
    icon: 'pass',
    minLevel: 3,
    description:
      'Дорога в соседнее княжество через голые скалы. Руда в жилах, силки на звериных тропах, снег до середины лета. Разбойники берут пошлину со всех, барсы — с невнимательных, дезертиры — с кого придётся. Княжеская стража сюда не поднимается уже пять лет. За перевалом — Брод.',
  },
  {
    id: 'ruins',
    name: 'Руины',
    x: 0.78,
    y: 0.82,
    icon: 'ruins',
    minLevel: 4,
    description:
      'Крепость-монастырь, сгоревшая ещё до чумы. Под камнями пряжки, перстни, наконечники, обломки икон — казначей князя платит вдвое и запоминает, кто принёс. В стенах железо, которого нет в шахте. Копают тут не только живые; враги на два уровня старше тебя.',
  },
  {
    id: 'brod',
    name: 'Брод',
    x: 0.08,
    y: 0.6,
    icon: 'town',
    minLevel: 3,
    description:
      'Вольный город за перевалом, без князя и без Хозяина. Арена без именных лиц, где каждый — никто и платят за это больше. Рынок берёт ресурсы на четыре десятых дороже. Купцы нанимают охрану в караваны через перевал: ставка втрое против шахты, на обратной дороге — разбойники.',
  },
];

export const LOCATIONS_BY_ID = Object.fromEntries(LOCATIONS.map((l) => [l.id, l])) as Record<LocationId, Location>;

export interface Route {
  from: LocationId;
  to: LocationId;
  /** Минут пути. */
  minutes: number;
}

export const ROUTES: Route[] = [
  { from: 'city', to: 'forest', minutes: 2 },
  { from: 'city', to: 'swamp', minutes: 4 },
  { from: 'city', to: 'ruins', minutes: 5 },
  { from: 'city', to: 'pass', minutes: 4 },
  { from: 'forest', to: 'pass', minutes: 3 },
  { from: 'pass', to: 'brod', minutes: 4 },
];

/** Открыта ли локация персонажу такого уровня. */
export function locationOpen(id: LocationId, level: number): boolean {
  return level >= LOCATIONS_BY_ID[id].minLevel;
}

/** Дорога между двумя локациями в любую сторону. */
export function routeBetween(a: LocationId, b: LocationId): Route | null {
  return ROUTES.find((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a)) ?? null;
}

export function neighbours(id: LocationId): LocationId[] {
  return ROUTES.filter((r) => r.from === id || r.to === id).map((r) => (r.from === id ? r.to : r.from));
}

export interface Travel {
  from: LocationId;
  to: LocationId;
  startedAt: number;
  minutes: number;
}

const MINUTE_MS = 60_000;

export function travelProgress(t: Travel, now: number): number {
  return Math.max(0, Math.min(1, (now - t.startedAt) / (t.minutes * MINUTE_MS)));
}

export function travelDone(t: Travel, now: number): boolean {
  return now - t.startedAt >= t.minutes * MINUTE_MS;
}

export function travelSecondsLeft(t: Travel, now: number): number {
  return Math.max(0, Math.ceil((t.startedAt + t.minutes * MINUTE_MS - now) / 1000));
}

export interface TravelCheck {
  ok: boolean;
  reason?: string;
  route?: Route;
}

/** Можно ли идти: локация открыта, дорога есть, персонаж не занят. */
export function canTravel(c: Character, to: LocationId, busy: { mining: boolean; gathering: boolean; traveling: boolean; fighting: boolean }): TravelCheck {
  const target = LOCATIONS_BY_ID[to];
  if (!target) return { ok: false, reason: 'Такого места нет' };
  if (!locationOpen(to, c.level)) return { ok: false, reason: `Туда пускают с ${target.minLevel} уровня. Пока дорога закрыта.` };
  if (to === c.location) return { ok: false, reason: 'Ты уже здесь' };
  if (busy.traveling) return { ok: false, reason: 'Ты уже в пути' };
  if (busy.fighting) return { ok: false, reason: 'Сначала закончи бой' };
  if (busy.mining) return { ok: false, reason: 'Ты в шахте. Забери заработок, потом иди.' };
  if (busy.gathering) return { ok: false, reason: 'Ты занят в лесу. Сначала собери, что набрал.' };
  const route = routeBetween(c.location, to);
  if (!route) return { ok: false, reason: `Из «${LOCATIONS_BY_ID[c.location].name}» туда дороги нет` };
  return { ok: true, route };
}
