import { describe, expect, it } from 'vitest';

import { LOOT_CHANCE, rollLoot } from './loot';
import { maxDurability, getItem } from './items';
import { generateOpponent } from './opponents';

describe('трофеи', () => {
  it('без вещей трофея нет, при неудачном броске тоже', () => {
    const naked = { ...generateOpponent(0, Math.random), itemIds: [] };
    expect(rollLoot(naked, () => 0, 'u')).toBeNull();
    const geared = { ...generateOpponent(0, Math.random), itemIds: ['knife'] };
    expect(rollLoot(geared, () => LOOT_CHANCE, 'u')).toBeNull();
  });

  it('трофей — вещь соперника с половиной прочности', () => {
    const geared = { ...generateOpponent(0, Math.random), itemIds: ['knife', 'cap'] };
    const loot = rollLoot(geared, (() => { let i = 0; return () => (i++ === 0 ? 0 : 0.99); })(), 'u1')!;
    expect(loot.itemId).toBe('cap');
    expect(loot.durability).toBe(Math.floor(maxDurability(getItem('cap')) / 2));
    expect(loot.upgrade).toBe(0);
    expect(loot.uid).toBe('u1');
  });
});
