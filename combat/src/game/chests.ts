import type { Character, InventoryItem, ItemDef } from './types';
import { ITEMS, ITEMS_BY_ID, itemDisplayName, maxDurability, UPGRADE_MAX } from './items';
import { deriveCharacter } from './character';
import { RESOURCES_BY_ID, type ResourceId } from './wilds';

// Сундуки: деревянный, окованный, княжеский. Падают за 7-й день подряд, за недельные цели,
// изредка с побеждённого и в события. Внутри — кредиты, ресурсы, зелье, вещь по уровню,
// редко — реликвии или заточённая вещь. Открытие — последовательное раскрытие строк на экране.

export type ChestKind = 'wooden' | 'bound' | 'princely';

export const CHEST_KINDS: ChestKind[] = ['wooden', 'bound', 'princely'];

export interface ChestDef {
  id: ChestKind;
  name: string;
  /** «из деревянного сундука». */
  genitive: string;
  description: string;
  /** Сколько строк добычи. */
  rolls: number;
}

export const CHESTS: Record<ChestKind, ChestDef> = {
  wooden: { id: 'wooden', name: 'Деревянный сундук', genitive: 'деревянного сундука', description: 'Сосна, ржавые петли, замка нет. Снят с телеги или с трупа.', rolls: 2 },
  bound: { id: 'bound', name: 'Окованный сундук', genitive: 'окованного сундука', description: 'Дуб в железных полосах. Такие стоят у купцов под кроватью.', rolls: 3 },
  princely: { id: 'princely', name: 'Княжеский сундук', genitive: 'княжеского сундука', description: 'Клеймо казначея, замок с секретом. Как попал к тебе — не спрашивай.', rolls: 4 },
};

export type Chests = Record<ChestKind, number>;

export function emptyChests(): Chests {
  return { wooden: 0, bound: 0, princely: 0 };
}

export function normalizeChests(raw?: Partial<Chests> | null): Chests {
  return { ...emptyChests(), ...(raw ?? {}) };
}

export function totalChests(chests: Chests | undefined | null): number {
  if (!chests) return 0;
  return CHEST_KINDS.reduce((s, k) => s + (chests[k] ?? 0), 0);
}

/** Одна строка добычи. */
export type ChestLoot =
  | { kind: 'kredits'; amount: number }
  | { kind: 'resource'; resource: ResourceId; amount: number }
  /** Зелье выпито на месте: здоровье полное. Если и так здоров — травы вместо него. */
  | { kind: 'heal' }
  | { kind: 'item'; itemId: string; upgrade: number }
  | { kind: 'chest'; chest: ChestKind };

export interface LootEntry {
  /** Вероятность строки; в каждой таблице суммы дают 1. */
  chance: number;
  roll: (level: number, rng: () => number) => ChestLoot;
}

const between = (rng: () => number, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

/** Вещь уровня игрока ±1 (в пределах каталога); если по какой-то причине пусто — любая. */
export function itemNear(level: number, rng: () => number, spread = 1): ItemDef {
  const base = Math.max(0, Math.min(6, level));
  const lo = Math.max(0, base - spread);
  const hi = Math.min(6, base + spread);
  const pool = ITEMS.filter((i) => i.level >= lo && i.level <= hi);
  const from = pool.length > 0 ? pool : ITEMS;
  return from[Math.floor(rng() * from.length)];
}

const kredits = (base: number, perLevel: number, jitter: number): LootEntry['roll'] => (level, rng) => ({
  kind: 'kredits',
  amount: base + perLevel * level + between(rng, 0, jitter),
});

const resource = (ids: ResourceId[], min: number, max: number): LootEntry['roll'] => (_level, rng) => ({
  kind: 'resource',
  resource: ids[Math.floor(rng() * ids.length)],
  amount: between(rng, min, max),
});

const item = (upgradeMin = 0, upgradeMax = 0, spread = 1): LootEntry['roll'] => (level, rng) => ({
  kind: 'item',
  itemId: itemNear(level, rng, spread).id,
  upgrade: Math.min(UPGRADE_MAX, between(rng, upgradeMin, upgradeMax)),
});

export const CHEST_TABLES: Record<ChestKind, LootEntry[]> = {
  wooden: [
    { chance: 0.4, roll: kredits(15, 8, 10) },
    { chance: 0.25, roll: resource(['herbs', 'wood'], 3, 6) },
    { chance: 0.15, roll: resource(['pelts', 'ore'], 2, 4) },
    { chance: 0.1, roll: () => ({ kind: 'heal' }) },
    { chance: 0.08, roll: item(0, 0) },
    { chance: 0.02, roll: resource(['relics'], 1, 1) },
  ],
  bound: [
    { chance: 0.3, roll: kredits(40, 20, 20) },
    { chance: 0.2, roll: resource(['herbs', 'wood', 'pelts', 'ore'], 5, 10) },
    { chance: 0.12, roll: resource(['bogwort'], 3, 5) },
    { chance: 0.1, roll: () => ({ kind: 'heal' }) },
    { chance: 0.18, roll: item(0, 0) },
    { chance: 0.05, roll: item(1, 1) },
    { chance: 0.04, roll: resource(['relics'], 2, 3) },
    { chance: 0.01, roll: () => ({ kind: 'chest', chest: 'princely' }) },
  ],
  princely: [
    { chance: 0.25, roll: kredits(100, 40, 50) },
    { chance: 0.15, roll: resource(['pelts', 'ore', 'bogwort'], 8, 15) },
    { chance: 0.1, roll: resource(['relics'], 3, 5) },
    { chance: 0.25, roll: item(0, 0) },
    { chance: 0.15, roll: item(1, 2) },
    { chance: 0.05, roll: item(2, 3, 0) },
    { chance: 0.05, roll: () => ({ kind: 'chest', chest: 'bound' }) },
  ],
};

/** Одна строка по таблице. */
export function rollLootEntry(kind: ChestKind, level: number, rng: () => number): ChestLoot {
  const table = CHEST_TABLES[kind];
  let r = rng();
  for (const e of table) {
    if (r < e.chance) return e.roll(level, rng);
    r -= e.chance;
  }
  return table[0].roll(level, rng);
}

/**
 * Содержимое сундука: `rolls` строк. Кредиты из одинаковых строк складываются в одну,
 * чтобы открытие читалось коротко.
 */
export function openChest(kind: ChestKind, level: number, rng: () => number): ChestLoot[] {
  const out: ChestLoot[] = [];
  for (let i = 0; i < CHESTS[kind].rolls; i++) {
    const loot = rollLootEntry(kind, Math.max(0, level), rng);
    const same = loot.kind === 'kredits' ? out.find((x): x is Extract<ChestLoot, { kind: 'kredits' }> => x.kind === 'kredits') : null;
    if (same && loot.kind === 'kredits') same.amount += loot.amount;
    else out.push(loot);
  }
  return out;
}

/** Шанс сундука с побеждённого: один бросок за бой, малый. */
export const CHEST_DROP: { kind: ChestKind; chance: number }[] = [
  { kind: 'princely', chance: 0.002 },
  { kind: 'bound', chance: 0.01 },
  { kind: 'wooden', chance: 0.04 },
];

export function rollChestDrop(rng: () => number, mult = 1): ChestKind | null {
  const r = rng();
  let acc = 0;
  for (const d of CHEST_DROP) {
    acc += d.chance * mult;
    if (r < acc) return d.kind;
  }
  return null;
}

/** Строка добычи словами: «+34 кр.», «Травы: 5 шт.», «Меч +1». */
export function lootText(loot: ChestLoot): string {
  switch (loot.kind) {
    case 'kredits':
      return `+${loot.amount} кр.`;
    case 'resource':
      return `${RESOURCES_BY_ID[loot.resource].name}: ${loot.amount} шт.`;
    case 'heal':
      return 'Зелье лекаря. Выпито на месте';
    case 'item': {
      const def = ITEMS_BY_ID[loot.itemId];
      return def ? itemDisplayName(def, loot.upgrade) : loot.itemId;
    }
    case 'chest':
      return CHESTS[loot.chest].name;
  }
}

/** Редкая строка — подсветить золотом. */
export function lootIsRare(loot: ChestLoot): boolean {
  if (loot.kind === 'chest') return true;
  if (loot.kind === 'item') return loot.upgrade > 0;
  if (loot.kind === 'resource') return loot.resource === 'relics';
  return false;
}

/** Применить добычу к персонажу: чистая функция, uid вещи даёт вызывающий. */
export function applyLoot(c: Character, loot: ChestLoot[], newUid: () => string): Character {
  let next: Character = c;
  for (const l of loot) {
    switch (l.kind) {
      case 'kredits':
        next = { ...next, kredits: next.kredits + l.amount, ledger: { ...next.ledger, kreditsEarned: next.ledger.kreditsEarned + l.amount } };
        break;
      case 'resource':
        next = { ...next, resources: { ...next.resources, [l.resource]: next.resources[l.resource] + l.amount } };
        break;
      case 'heal': {
        const maxHp = deriveCharacter(next).maxHp;
        next = next.hp >= maxHp ? { ...next, resources: { ...next.resources, herbs: next.resources.herbs + 3 } } : { ...next, hp: maxHp, hpUpdatedAt: Date.now() };
        break;
      }
      case 'item': {
        const def = ITEMS_BY_ID[l.itemId];
        if (!def) break;
        const inv: InventoryItem = { uid: newUid(), itemId: l.itemId, durability: maxDurability(def), upgrade: l.upgrade };
        next = { ...next, backpack: [...next.backpack, inv] };
        break;
      }
      case 'chest':
        next = { ...next, chests: { ...normalizeChests(next.chests), [l.chest]: (next.chests?.[l.chest] ?? 0) + 1 } };
        break;
    }
  }
  return next;
}

/** Выдать сундук персонажу. */
export function giveChest(c: Character, kind: ChestKind, n = 1): Character {
  const chests = normalizeChests(c.chests);
  return { ...c, chests: { ...chests, [kind]: chests[kind] + n } };
}
