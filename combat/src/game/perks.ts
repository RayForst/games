import type { DerivedStats } from './types';
import { ALIGNMENT_PERK_AT } from './story';

// Умения: на определённых уровнях игрок выбирает одно из трёх случайных. Эффекты живут здесь,
// применяются в deriveStats после предметов.

export type PerkId =
  | 'thick-skull'
  | 'iron-gut'
  | 'quick-hands'
  | 'eagle-eye'
  | 'heavy-hand'
  | 'stone-wall'
  | 'miner'
  | 'haggler'
  | 'scholar'
  | 'second-wind'
  | 'cat-step'
  | 'long-arm'
  | 'bull-neck'
  | 'oak-legs'
  | 'cold-blood'
  | 'brawler'
  | 'tough-hide'
  | 'light-sleeper'
  | 'coal-lungs'
  | 'tavern-regular'
  | 'rat-cunning'
  | 'clear-conscience'
  | 'black-heart';

export interface PerkDef {
  id: PerkId;
  name: string;
  description: string;
  /** Умение склонности: предлагается только Святоше (light, ≥ +60) или Чёрному (dark, ≤ −60). */
  alignment?: 'light' | 'dark';
  apply: (d: DerivedStats) => void;
}

/** Уровни, на которых дают выбрать умение. */
export const PERK_LEVELS = [2, 4, 6, 8, 10];

export const PERKS: PerkDef[] = [
  { id: 'thick-skull', name: 'Крепкий череп', description: '+2 брони головы', apply: (d) => void (d.armor.head += 2) },
  { id: 'iron-gut', name: 'Железное брюхо', description: '+10 % здоровья', apply: (d) => void (d.maxHp += Math.ceil(d.maxHp * 0.1)) },
  { id: 'quick-hands', name: 'Быстрые руки', description: '+4 % уворота', apply: (d) => void (d.dodge += 4) },
  { id: 'eagle-eye', name: 'Орлиный глаз', description: '+4 % крита', apply: (d) => void (d.crit += 4) },
  {
    id: 'heavy-hand',
    name: 'Тяжёлая рука',
    description: '+1 к минимальному и +2 к максимальному урону',
    apply: (d) => {
      d.dmgMin += 1;
      d.dmgMax += 2;
    },
  },
  {
    id: 'stone-wall',
    name: 'Каменная стена',
    description: '+1 брони во все зоны',
    apply: (d) => {
      d.armor.head += 1;
      d.armor.body += 1;
      d.armor.belt += 1;
      d.armor.legs += 1;
    },
  },
  { id: 'miner', name: 'Шахтёр', description: '+3 кр. в час в шахте', apply: (d) => void (d.mineBonus += 3) },
  { id: 'haggler', name: 'Торгаш', description: 'Лекарь берёт на 30 % меньше', apply: (d) => void (d.healMult *= 0.7) },
  { id: 'scholar', name: 'Грамотей', description: '+15 % опыта за бой', apply: (d) => void (d.expMult *= 1.15) },
  { id: 'second-wind', name: 'Второе дыхание', description: 'Здоровье восстанавливается в полтора раза быстрее', apply: (d) => void (d.regenMult *= 1.5) },
  { id: 'cat-step', name: 'Кошачий шаг', description: '+3 % защиты от крита', apply: (d) => void (d.antiCrit += 3) },
  { id: 'long-arm', name: 'Длинная рука', description: '+3 % пробития уворота', apply: (d) => void (d.antiDodge += 3) },
  { id: 'bull-neck', name: 'Бычья шея', description: '+2 брони корпуса', apply: (d) => void (d.armor.body += 2) },
  { id: 'oak-legs', name: 'Дубовые ноги', description: '+2 брони ног', apply: (d) => void (d.armor.legs += 2) },
  {
    id: 'cold-blood',
    name: 'Холодная кровь',
    description: '+2 % крита и +2 % защиты от крита',
    apply: (d) => {
      d.crit += 2;
      d.antiCrit += 2;
    },
  },
  {
    id: 'brawler',
    name: 'Драчун',
    description: '+2 к максимальному урону, −2 % уворота',
    apply: (d) => {
      d.dmgMax += 2;
      d.dodge -= 2;
    },
  },
  {
    id: 'tough-hide',
    name: 'Дублёная шкура',
    description: '+5 % здоровья и +1 брони корпуса',
    apply: (d) => {
      d.maxHp += Math.ceil(d.maxHp * 0.05);
      d.armor.body += 1;
    },
  },
  { id: 'light-sleeper', name: 'Чуткий сон', description: 'Здоровье восстанавливается на четверть быстрее', apply: (d) => void (d.regenMult *= 1.25) },
  {
    id: 'coal-lungs',
    name: 'Угольные лёгкие',
    description: '+2 кр. в час в шахте и +4 здоровья',
    apply: (d) => {
      d.mineBonus += 2;
      d.maxHp += 4;
    },
  },
  {
    id: 'tavern-regular',
    name: 'Завсегдатай',
    description: '+8 % опыта за бой, лекарь берёт на 10 % меньше',
    apply: (d) => {
      d.expMult *= 1.08;
      d.healMult *= 0.9;
    },
  },
  {
    id: 'rat-cunning',
    name: 'Крысиная хитрость',
    description: '+2 % уворота и +2 % крита',
    apply: (d) => {
      d.dodge += 2;
      d.crit += 2;
    },
  },
  // Склонность (story.ts): по одному умению для крайностей.
  {
    id: 'clear-conscience',
    name: 'Чистая совесть',
    description: 'Святоша: +8 % здоровья, лекарь берёт на 20 % меньше',
    alignment: 'light',
    apply: (d) => {
      d.maxHp += Math.ceil(d.maxHp * 0.08);
      d.healMult *= 0.8;
    },
  },
  {
    id: 'black-heart',
    name: 'Чёрное сердце',
    description: 'Чёрный: +4 % крита и +2 к максимальному урону',
    alignment: 'dark',
    apply: (d) => {
      d.crit += 4;
      d.dmgMax += 2;
    },
  },
];

export const PERKS_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p])) as Record<PerkId, PerkDef>;

/** Сколько «окон выбора» открылось при росте с уровня `from` до `to`. */
export function perkPicksBetween(from: number, to: number): number {
  return PERK_LEVELS.filter((l) => l > from && l <= to).length;
}

/** Доступно ли умение при этой склонности: обычные — всегда, умения склонности — на краях шкалы. */
export function perkAllowed(p: PerkDef, alignment = 0): boolean {
  if (p.alignment === 'light') return alignment >= ALIGNMENT_PERK_AT;
  if (p.alignment === 'dark') return alignment <= -ALIGNMENT_PERK_AT;
  return true;
}

/** Три случайных умения из тех, что ещё не взяты; умения склонности — только по склонности. */
export function offerPerks(owned: PerkId[], rng: () => number, count = 3, alignment = 0): PerkId[] {
  const pool = PERKS.filter((p) => !owned.includes(p.id) && perkAllowed(p, alignment)).map((p) => p.id);
  const picked: PerkId[] = [];
  while (picked.length < count && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

export function applyPerks(d: DerivedStats, perks: PerkId[]): DerivedStats {
  for (const id of perks) PERKS_BY_ID[id]?.apply(d);
  return d;
}
