import type { InventoryItem, Opponent } from './types';
import { ITEMS_BY_ID, maxDurability } from './items';

// Трофеи: после победы есть шанс забрать одну из вещей соперника. Изношенную — снимали с тела.

export const LOOT_CHANCE = 0.2;

/** Вещь соперника как трофей или null. Прочность трофея — половина. */
export function rollLoot(opponent: Opponent, rng: () => number, uid: string): InventoryItem | null {
  if (opponent.itemIds.length === 0 || rng() >= LOOT_CHANCE) return null;
  const itemId = opponent.itemIds[Math.floor(rng() * opponent.itemIds.length)];
  const item = ITEMS_BY_ID[itemId];
  if (!item) return null;
  return { uid, itemId, durability: Math.max(1, Math.floor(maxDurability(item) / 2)), upgrade: 0 };
}
