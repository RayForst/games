import type { Character } from './types';
import type { CapitalId } from './races';

// Карта мира: локации и дороги между ними. Переход занимает реальное время, как шахта.

export type LocationId = 'city' | 'forest' | 'swamp' | 'ruins' | 'pass' | 'brod' | 'rudnya' | 'zastava' | 'kosh' | 'kamenka' | 'topi' | 'crypt';

/** Города: арена, лавка/рынок, работа. Совпадают со столицами рас (`CAPITALS` в races.ts). */
export type TownId = 'city' | 'brod' | 'rudnya' | 'zastava' | 'kosh' | 'kamenka' | 'topi';

export const TOWN_IDS: TownId[] = ['city', 'brod', 'rudnya', 'zastava', 'kosh', 'kamenka', 'topi'];

export function isTown(id: string): id is TownId {
  return (TOWN_IDS as string[]).includes(id);
}

export interface Location {
  id: LocationId;
  name: string;
  /** Точка на карте мира в долях ширины/высоты (0..1). */
  x: number;
  y: number;
  /** Иконка из GI (gi.generated). */
  icon: 'city' | 'forest' | 'swamp' | 'ruins' | 'pass' | 'town' | 'skull';
  /** С какого уровня персонажа дорога туда открыта. Родной город (`Character.home`) открыт с нуля. */
  minLevel: number;
  description: string;
}

export const LOCATIONS: Location[] = [
  {
    id: 'city',
    name: 'Город',
    x: 0.5,
    y: 0.36,
    icon: 'city',
    minLevel: 0,
    description:
      'Городок на холмах у реки, после войны и чумы. Одна улица: шахта, кузница Макара, ломбард с решётками, клуб с красными флагами, зелёный фонарь лекаря и пивная «У виселицы». За рекой — замок князя, который сюда не спускается.',
  },
  {
    id: 'forest',
    name: 'Лес',
    x: 0.2,
    y: 0.1,
    icon: 'forest',
    minLevel: 0,
    description:
      'Сосновый бор за рекой, две минуты от моста. Травы для лекаря, дрова для Макара, шкуры для лавки. Волки ходят стаей, кабаны — по одному, разбойники и браконьеры — за тобой. Засада на обратной тропе раз из четырёх.',
  },
  {
    id: 'swamp',
    name: 'Болото',
    x: 0.8,
    y: 0.1,
    icon: 'swamp',
    minLevel: 2,
    description:
      'Гнилые топи за восточной дорогой, туман до полудня. Растёт болотник, за который лекарь платит и снимает травмы; река приносит плавник. Из жижи вылезает всякое, по тропам ходят контрабандисты. Тут засада чаще, чем через раз, и враги на уровень злее.',
  },
  {
    id: 'pass',
    name: 'Перевал',
    x: 0.26,
    y: 0.74,
    icon: 'pass',
    minLevel: 3,
    description:
      'Дорога в соседнее княжество через голые скалы. Руда в жилах, силки на звериных тропах, снег до середины лета. Разбойники берут пошлину со всех, барсы — с невнимательных, дезертиры — с кого придётся. Княжеская стража сюда не поднимается уже пять лет. За перевалом — Брод.',
  },
  {
    id: 'ruins',
    name: 'Руины',
    x: 0.78,
    y: 0.84,
    icon: 'ruins',
    minLevel: 4,
    description:
      'Крепость-монастырь, сгоревшая ещё до чумы. Под камнями пряжки, перстни, наконечники, обломки икон — казначей князя платит вдвое и запоминает, кто принёс. В стенах железо, которого нет в шахте. Копают тут не только живые; враги на два уровня старше тебя.',
  },
  {
    id: 'brod',
    name: 'Брод',
    x: 0.08,
    y: 0.56,
    icon: 'town',
    minLevel: 3,
    description:
      'Вольный город за перевалом, без князя и без Хозяина. Арена без именных лиц, где каждый — никто и платят за это больше. Рынок берёт ресурсы на четверть дороже. Купцы нанимают охрану в караваны через перевал: ставка выше шахты, на обратной дороге — разбойники.',
  },
  {
    id: 'zastava',
    name: 'Застава',
    x: 0.5,
    y: 0.08,
    icon: 'town',
    minLevel: 2,
    description:
      'Пограничная крепость на северном тракте, в трёх минутах от Города. Полукровок тут больше, чем людей: стража своя, законы князя читают по настроению. Обозы идут через ворота и нанимают охрану; гарнизонный лекарь штопает дёшево, потому что привык.',
  },
  {
    id: 'rudnya',
    name: 'Рудня',
    x: 0.72,
    y: 0.54,
    icon: 'town',
    minLevel: 2,
    description:
      'Рудокопский посад карлов в горах за рекой, над старыми серебряными штольнями. Серебро кончилось, железо — нет: кузницы дымят круглые сутки и берут за работу меньше городских. Шахта глубже городской, пиво варят из ячменя и злобы.',
  },
  {
    id: 'kamenka',
    name: 'Каменка',
    x: 0.1,
    y: 0.3,
    icon: 'town',
    minLevel: 3,
    description:
      'Орочье селение в скалах к северу от Брода: дома в пещерах, костры на уступах. Своего хлеба нет, поэтому за шкуры, руду и всё, что можно съесть или выковать, горцы платят больше рынка. Арена — площадка над обрывом, падать с неё не принято.',
  },
  {
    id: 'kosh',
    name: 'Кош',
    x: 0.08,
    y: 0.9,
    icon: 'town',
    minLevel: 3,
    description:
      'Степной стан за перевалом: глинобитные стены, табуны, торг конями и всем, что на конях увезли. Караваны отсюда ходят на степных лошадях и оборачиваются быстрее, оттого и платят за час больше. Дерутся в кругу из телег.',
  },
  {
    id: 'topi',
    name: 'Топи',
    x: 0.9,
    y: 0.3,
    icon: 'town',
    minLevel: 3,
    description:
      'Свайный город болотников на островах среди топи, за Болотом. Тропы знают только свои, чужие приходят с плотами и не все уходят. Болотник тут растёт под каждым крыльцом, и лекарь снимает за него травмы дешевле любого городского.',
  },
  {
    id: 'crypt',
    name: 'Склеп',
    x: 0.3,
    y: 0.5,
    icon: 'skull',
    minLevel: 1,
    description:
      'Старое кладбище между Городом и Бродом, а под ним — ход, который рыли ещё до чумы. Пять ярусов вниз: на верхних скребутся скелеты, ниже — упыри и костяная стража. Кости скупают лавки, лекарь и кузнецы. Говорят, нижний ярус выходит в чужой город, и ходят туда не молиться.',
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
  // Столицы Короны — вокруг Города.
  { from: 'city', to: 'zastava', minutes: 3 },
  { from: 'city', to: 'rudnya', minutes: 3 },
  { from: 'rudnya', to: 'ruins', minutes: 3 },
  // Столицы Вольницы — вокруг Брода; Топи — за Болотом.
  { from: 'brod', to: 'kamenka', minutes: 3 },
  { from: 'brod', to: 'kosh', minutes: 3 },
  { from: 'pass', to: 'kosh', minutes: 3 },
  { from: 'swamp', to: 'topi', minutes: 3 },
  // Склеп — между столицами сторон.
  { from: 'city', to: 'crypt', minutes: 2 },
  { from: 'brod', to: 'crypt', minutes: 3 },
];

/** Открыта ли локация персонажу такого уровня. Родной город открыт всегда. */
export function locationOpen(id: LocationId, level: number, home?: CapitalId | null): boolean {
  if (home && id === home) return true;
  return level >= LOCATIONS_BY_ID[id].minLevel;
}

/** Дорога между двумя локациями в любую сторону. */
export function routeBetween(a: LocationId, b: LocationId): Route | null {
  return ROUTES.find((r) => (r.from === a && r.to === b) || (r.from === b && r.to === a)) ?? null;
}

export function neighbours(id: LocationId): LocationId[] {
  return ROUTES.filter((r) => r.from === id || r.to === id).map((r) => (r.from === id ? r.to : r.from));
}

/**
 * Кратчайший путь по дорогам в минутах (Дейкстра по дюжине узлов). Закрытые локации по пути не мешают:
 * путник идёт сквозь них не останавливаясь. null — дороги нет вовсе.
 */
export function pathMinutes(from: LocationId, to: LocationId): number | null {
  if (from === to) return 0;
  const dist = new Map<LocationId, number>([[from, 0]]);
  const done = new Set<LocationId>();
  for (;;) {
    let cur: LocationId | null = null;
    for (const [id, d] of dist) if (!done.has(id) && (cur === null || d < (dist.get(cur) ?? Infinity))) cur = id;
    if (cur === null) return null;
    if (cur === to) return dist.get(cur) ?? null;
    done.add(cur);
    for (const n of neighbours(cur)) {
      const d = (dist.get(cur) ?? 0) + (routeBetween(cur, n)?.minutes ?? 0);
      if (d < (dist.get(n) ?? Infinity)) dist.set(n, d);
    }
  }
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

export interface Busy {
  mining: boolean;
  gathering: boolean;
  traveling: boolean;
  fighting: boolean;
}

function busyReason(busy: Busy): string | null {
  if (busy.traveling) return 'Ты уже в пути';
  if (busy.fighting) return 'Сначала закончи бой';
  if (busy.mining) return 'Ты на работе. Забери заработок, потом иди.';
  if (busy.gathering) return 'Ты занят в лесу. Сначала собери, что набрал.';
  return null;
}

/** Можно ли идти: локация открыта (родной город — всегда), дорога есть, персонаж не занят. */
export function canTravel(c: Character, to: LocationId, busy: Busy): TravelCheck {
  const target = LOCATIONS_BY_ID[to];
  if (!target) return { ok: false, reason: 'Такого места нет' };
  if (!locationOpen(to, c.level, c.home)) return { ok: false, reason: `Туда пускают с ${target.minLevel} уровня. Пока дорога закрыта.` };
  if (to === c.location) return { ok: false, reason: 'Ты уже здесь' };
  const why = busyReason(busy);
  if (why) return { ok: false, reason: why };
  const route = routeBetween(c.location, to);
  if (!route) return { ok: false, reason: `Из «${LOCATIONS_BY_ID[c.location].name}» туда дороги нет` };
  return { ok: true, route };
}

/**
 * Дорога домой одним переходом: сумма минут по кратчайшему пути. Родной город открыт всегда,
 * так что проверяем только занятость и то, что путь вообще есть.
 */
export function canTravelHome(c: Character, busy: Busy): TravelCheck {
  if (!isTown(c.home) || !LOCATIONS_BY_ID[c.home]) return { ok: false, reason: 'Родного города на карте нет' };
  if (c.home === c.location) return { ok: false, reason: 'Ты и так дома' };
  const why = busyReason(busy);
  if (why) return { ok: false, reason: why };
  const minutes = pathMinutes(c.location, c.home);
  if (minutes === null) return { ok: false, reason: 'Отсюда домой дороги нет' };
  return { ok: true, route: { from: c.location, to: c.home, minutes } };
}
