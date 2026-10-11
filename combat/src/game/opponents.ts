import type { Opponent, Slot, StatKey, Stats } from './types';
import { SLOTS, STAT_KEYS } from './types';
import { ITEMS } from './items';
import { baseStats, deriveStats, statPointsTotal } from './formulas';
import type { Rng } from './combat';

const NAMES = [
  'Крыса Вася', 'Бомж с Арбата', 'Гопник Толян', 'Хмурый Гном', 'Колян Задира', 'Тихий Ужас',
  'Пьяный Гоблин', 'Хромой Пётр', 'Сеня Кулак', 'Злой Ботан', 'Дядя Жора', 'Рыжая Бестия',
  'Мясник', 'Серый Волк', 'Костолом', 'Хитрый Лис', 'Железный Дровосек', 'Ночной Сторож',
  'Берсерк Бодя', 'Лысый Череп', 'Кузнец Макар', 'Громила', 'Тень', 'Палач Федя',
  'Вдова Нюра', 'Атаман', 'Чёрная Кошка', 'Мельник Тит', 'Бродяга', 'Старый Солдат',
];

const FLAVOR = [
  'Пришёл за лёгкими деньгами.',
  'Дерётся за еду.',
  'Любит бить по ногам.',
  'Никогда не держит блок дважды.',
  'Говорят, бывший чемпион.',
  'Смотрит на тебя как на мясо.',
  'Разминается уже час.',
  'Ищет, с кем бы подраться.',
  'Хромает, но опасен.',
  'Пахнет перегаром и кровью.',
];

type Archetype = { name: string; weights: Record<StatKey, number> };

const ARCHETYPES: Archetype[] = [
  { name: 'воин', weights: { strength: 4, dexterity: 1, intuition: 1, endurance: 3 } },
  { name: 'ловкач', weights: { strength: 1, dexterity: 4, intuition: 2, endurance: 2 } },
  { name: 'критовик', weights: { strength: 2, dexterity: 1, intuition: 4, endurance: 2 } },
  { name: 'танк', weights: { strength: 2, dexterity: 1, intuition: 1, endurance: 5 } },
  { name: 'универсал', weights: { strength: 2, dexterity: 2, intuition: 2, endurance: 2 } },
];

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Раскидывает очки по весам архетипа, итог — столько же очков, сколько у игрока того же уровня. */
function rollStats(level: number, arch: Archetype, rng: Rng): Stats {
  const stats = baseStats();
  let points = statPointsTotal(level) - STAT_KEYS.reduce((s, k) => s + stats[k], 0);
  const total = STAT_KEYS.reduce((s, k) => s + arch.weights[k], 0);
  while (points > 0) {
    let r = rng() * total;
    for (const k of STAT_KEYS) {
      r -= arch.weights[k];
      if (r <= 0) {
        stats[k] += 1;
        break;
      }
    }
    points -= 1;
  }
  return stats;
}

function meetsRequirements(stats: Stats, req?: Partial<Record<StatKey, number>>): boolean {
  if (!req) return true;
  return STAT_KEYS.every((k) => (req[k] ?? 0) <= stats[k]);
}

/**
 * Экипировка бота. `gearScale` в [0..1] режет шансы на каждый слот —
 * так «слабый» соперник в зале приходит почти голым, а «сильный» — одетым.
 */
function rollGear(level: number, stats: Stats, gearScale: number, rng: Rng): string[] {
  const ids: string[] = [];
  const chance: Record<Slot, number> = {
    weapon: 0.9, shield: 0.3, helmet: 0.5, armor: 0.6, gloves: 0.4, belt: 0.4, pants: 0.5, boots: 0.5,
  };
  for (const slot of SLOTS) {
    if (rng() >= (chance[slot] + level * 0.05) * gearScale) continue;
    const options = ITEMS.filter((i) => i.slot === slot && i.level <= level && meetsRequirements(stats, i.requires));
    if (options.length === 0) continue;
    // Предпочитаем предметы ближе к уровню бота.
    const best = options.filter((i) => i.level >= level - 1);
    ids.push(pick(rng, best.length > 0 ? best : options).id);
  }
  return ids;
}

export function generateOpponent(level: number, rng: Rng, usedNames: Set<string> = new Set(), gearScale = 1): Opponent {
  const lvl = Math.max(0, level);
  const arch = pick(rng, ARCHETYPES);
  const stats = rollStats(lvl, arch, rng);
  const itemIds = rollGear(lvl, stats, Math.max(0, Math.min(1, gearScale)), rng);
  let name = pick(rng, NAMES);
  let guard = 0;
  while (usedNames.has(name) && guard < 20) {
    name = pick(rng, NAMES);
    guard += 1;
  }
  usedNames.add(name);
  return {
    id: `${Date.now().toString(36)}-${Math.floor(rng() * 1e9).toString(36)}`,
    name,
    level: lvl,
    stats,
    itemIds,
    derived: deriveStats(stats, lvl, itemIds),
    flavor: `${arch.name[0].toUpperCase()}${arch.name.slice(1)}. ${pick(rng, FLAVOR)}`,
  };
}

/**
 * Список соперников в зале: один слабее (почти без вещей), двое равных, один сильнее (одет).
 * На нулевом уровне у игрока ещё нет шмота, поэтому боты там тоже ходят полуголыми.
 */
export function generateArena(playerLevel: number, rng: Rng): Opponent[] {
  const base = Math.min(1, 0.4 + playerLevel * 0.2);
  const tiers: { level: number; gear: number }[] = [
    { level: playerLevel - 1, gear: base * 0.4 },
    { level: playerLevel, gear: base * 0.8 },
    { level: playerLevel, gear: base * 0.8 },
    { level: playerLevel + 1, gear: base },
  ];
  const used = new Set<string>();
  return tiers.map((t) => generateOpponent(Math.max(0, t.level), rng, used, t.gear));
}
