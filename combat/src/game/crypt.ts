import type { Opponent } from './types';
import { ARMOR_ZONES } from './types';
import { generateOpponent } from './opponents';
import { deriveStats } from './formulas';

// Склеп: пять ярусов под старым кладбищем между Городом и Бродом. На каждом — бой с нежитью,
// за победу кости и шаг вниз. Спуск за день: прошёл ярус — следующий открыт, в полночь всё
// засыпает обратно. С пятого яруса есть выход в чужую столицу — рейд (raid.ts).

export const CRYPT_FLOORS = 5;

export interface CryptFoe {
  name: string;
  flavor: string;
  /** В костяной броне: одет в то, в чём хоронили, — с него бывает трофей. */
  armored: boolean;
  icon: 'skull' | 'ghoul' | 'drowned';
}

export interface CryptFloorDef {
  floor: number;
  name: string;
  /** На сколько уровней враги яруса отличаются от игрока. */
  levelBonus: number;
  /** Костей за победу: от и до. */
  bones: [number, number];
  foes: CryptFoe[];
  flavor: string;
}

export const CRYPT: CryptFloorDef[] = [
  {
    floor: 1,
    name: 'Верхний ярус',
    levelBonus: -1,
    bones: [2, 4],
    flavor: 'Сырые ступени, гробы в нишах. Кто-то снял с них крышки раньше тебя.',
    foes: [
      { name: 'Скелет', flavor: 'Гремит, но держится. Меча нет, зато есть собственная берцовая кость.', armored: false, icon: 'skull' },
      { name: 'Могильный червь', flavor: 'Толщиной с руку, длиной с тебя. Зубы в три ряда.', armored: false, icon: 'drowned' },
      { name: 'Костяк в саване', flavor: 'Саван истлел, злоба нет. Тянется к горлу.', armored: false, icon: 'skull' },
    ],
  },
  {
    floor: 2,
    name: 'Галерея',
    levelBonus: 0,
    bones: [3, 5],
    flavor: 'Длинный коридор с черепами в стенах. Черепа смотрят. Некоторые — моргают.',
    foes: [
      { name: 'Скелет-стражник', flavor: 'В ржавой кольчуге и с ржавым тесаком. Службу помнит, пароль — нет.', armored: true, icon: 'skull' },
      { name: 'Упырь', flavor: 'Из тех, кого в чуму хоронили наспех. Голоден двести лет.', armored: false, icon: 'ghoul' },
      { name: 'Костяная псина', flavor: 'Сторожила склеп при жизни. Ошейник пережил шею.', armored: false, icon: 'drowned' },
    ],
  },
  {
    floor: 3,
    name: 'Усыпальница',
    levelBonus: 0,
    bones: [4, 6],
    flavor: 'Каменные саркофаги с гербами, которых больше никто не носит. Крышки сдвинуты изнутри.',
    foes: [
      { name: 'Гниющий монах', flavor: 'Братья замуровали его за ересь. Ересь оказалась живучей.', armored: true, icon: 'ghoul' },
      { name: 'Костяк в латах', flavor: 'Хоронили как рыцаря. Латы проржавели, выправка нет.', armored: true, icon: 'skull' },
      { name: 'Упырица', flavor: 'Быстрее мужа и злее. Муж лежит рядом, по частям.', armored: false, icon: 'ghoul' },
    ],
  },
  {
    floor: 4,
    name: 'Костница',
    levelBonus: 1,
    bones: [5, 8],
    flavor: 'Зал, сложенный из костей до потолка. Что-то собирает их обратно в тела.',
    foes: [
      { name: 'Костяной страж', flavor: 'Собран из трёх скелетов, чтобы никто не прошёл. Пока никто и не прошёл.', armored: true, icon: 'skull' },
      { name: 'Чумной упырь', flavor: 'Раздутый, в бубонах. Не трогай руками. Он тебя — тронет.', armored: false, icon: 'ghoul' },
      { name: 'Безголовый латник', flavor: 'Голову потерял в бою. Бой, судя по всему, продолжает.', armored: true, icon: 'skull' },
    ],
  },
  {
    floor: 5,
    name: 'Нижний ход',
    levelBonus: 1,
    bones: [6, 10],
    flavor: 'Коридор уходит вдаль, сверху слышен чужой город. Последний, кто тут стоит, не пускает.',
    foes: [
      { name: 'Костяной воевода', flavor: 'Командовал при жизни, командует и теперь. Подчинённые лежат вокруг — пока лежат.', armored: true, icon: 'skull' },
      { name: 'Князь-упырь', flavor: 'Чей-то предок. Корона съехала, зубы — нет.', armored: true, icon: 'ghoul' },
      { name: 'Тень склепа', flavor: 'Не кости и не мясо. Сначала холод, потом боль, потом ничего.', armored: false, icon: 'drowned' },
    ],
  },
];

export const CRYPT_BY_FLOOR = Object.fromEntries(CRYPT.map((f) => [f.floor, f])) as Record<number, CryptFloorDef>;

/** Прогресс спуска: сколько ярусов пройдено сегодня. В полночь — заново. */
export interface CryptState {
  day: string;
  floor: number;
}

export function newCrypt(day: string): CryptState {
  return { day, floor: 0 };
}

export function normalizeCrypt(raw: Partial<CryptState> | null | undefined, day: string): CryptState {
  if (!raw || typeof raw.day !== 'string' || raw.day !== day) return newCrypt(day);
  return { day: raw.day, floor: Math.max(0, Math.min(CRYPT_FLOORS, Math.floor(typeof raw.floor === 'number' ? raw.floor : 0))) };
}

/** Какой ярус ждёт следующим (1..5) или null, если на сегодня склеп пройден. */
export function nextFloor(s: CryptState): number | null {
  return s.floor >= CRYPT_FLOORS ? null : s.floor + 1;
}

export function cryptCleared(s: CryptState): boolean {
  return s.floor >= CRYPT_FLOORS;
}

export function cryptLevel(floor: number, playerLevel: number): number {
  return Math.max(0, playerLevel + (CRYPT_BY_FLOOR[floor]?.levelBonus ?? 0));
}

/**
 * Нежить яруса: без стороны и расы (войну сторон не двигает), скелеты голые, латники в том, в чём хоронили.
 * Кость ничего не чувствует: +1 брони на всё тело у любого.
 */
export function cryptOpponent(floor: number, playerLevel: number, rng: () => number): Opponent & { foeIcon: CryptFoe['icon'] } {
  const def = CRYPT_BY_FLOOR[floor] ?? CRYPT[CRYPT.length - 1];
  const foe = def.foes[Math.floor(rng() * def.foes.length)];
  const level = cryptLevel(def.floor, playerLevel);
  const base = generateOpponent(level, rng, new Set(), foe.armored ? 0.5 : 0);
  const itemIds = foe.armored ? base.itemIds : [];
  const derived = deriveStats(base.stats, base.level, itemIds, [], null);
  for (const z of ARMOR_ZONES) derived.armor[z] += 1;
  return {
    ...base,
    id: `crypt:${def.floor}:${base.id}`,
    name: foe.name,
    flavor: foe.flavor,
    itemIds,
    derived,
    side: undefined,
    race: undefined,
    foeIcon: foe.icon,
  };
}

/** Костей за победу на ярусе. */
export function cryptBones(floor: number, rng: () => number): number {
  const [lo, hi] = CRYPT_BY_FLOOR[floor]?.bones ?? [1, 2];
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Пройден ярус — шаг вниз. Идемпотентно: победа над «старым» ярусом второй раз спуск не двигает. */
export function cryptAfterWin(s: CryptState, floor: number): CryptState {
  if (floor !== s.floor + 1) return s;
  return { ...s, floor: Math.min(CRYPT_FLOORS, floor) };
}
