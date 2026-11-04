import type { Character } from './types';

// Карта мира: локации и дороги между ними. Переход занимает реальное время, как шахта.

export type LocationId = 'city' | 'forest' | 'swamp' | 'ruins' | 'pass';

export interface Location {
  id: LocationId;
  name: string;
  /** Точка на карте мира в долях ширины/высоты (0..1). */
  x: number;
  y: number;
  /** Иконка из GI (gi.generated). */
  icon: 'city' | 'forest' | 'swamp' | 'ruins' | 'pass';
  /** С какого уровня персонажа дорога туда открыта. */
  minLevel: number;
  description: string;
}

export const LOCATIONS: Location[] = [
  { id: 'city', name: 'Город', x: 0.5, y: 0.56, icon: 'city', minLevel: 0, description: 'Арена, лавка, кузница, лекарь, пивная, шахта и замок князя за рекой.' },
  { id: 'forest', name: 'Лес', x: 0.2, y: 0.3, icon: 'forest', minLevel: 0, description: 'Сосновый бор за рекой. Травы, дрова, зверьё и те, кто на него охотится.' },
  { id: 'swamp', name: 'Болото', x: 0.8, y: 0.28, icon: 'swamp', minLevel: 2, description: 'Гнилые топи. Болотник, за который лекарь платит, и то, что вылезает из жижи.' },
  { id: 'pass', name: 'Перевал', x: 0.22, y: 0.84, icon: 'pass', minLevel: 3, description: 'Дорога в соседнее княжество. Руда в скалах, барсы на скалах, разбойники под скалами.' },
  { id: 'ruins', name: 'Руины', x: 0.78, y: 0.82, icon: 'ruins', minLevel: 4, description: 'Старая крепость. Реликвии под камнями и те, кто их уже ищет.' },
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
