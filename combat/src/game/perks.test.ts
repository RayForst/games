import { describe, expect, it } from 'vitest';

import { baseStats, deriveStats } from './formulas';
import { offerPerks, PERK_LEVELS, PERKS, perkPicksBetween } from './perks';
import { mineRatePerHour } from './mine';

describe('умения', () => {
  it('окна выбора считаются по уровням', () => {
    expect(perkPicksBetween(0, 1)).toBe(0);
    expect(perkPicksBetween(1, 2)).toBe(1);
    expect(perkPicksBetween(0, 5)).toBe(2);
    expect(perkPicksBetween(3, 10)).toBe(4);
    expect(PERK_LEVELS[0]).toBe(2);
  });

  it('предложение не повторяет взятое и не повторяется внутри себя', () => {
    const owned = PERKS.slice(0, 8).map((p) => p.id);
    const offer = offerPerks(owned, Math.random);
    expect(offer).toHaveLength(2);
    for (const id of offer) expect(owned).not.toContain(id);
    const full = offerPerks([], () => 0);
    expect(new Set(full).size).toBe(3);
  });

  it('эффекты меняют производные характеристики', () => {
    const plain = deriveStats(baseStats(), 0, []);
    const d = deriveStats(baseStats(), 0, [], ['thick-skull', 'iron-gut', 'heavy-hand', 'miner', 'haggler', 'scholar', 'second-wind']);
    expect(d.armor.head).toBe(plain.armor.head + 2);
    expect(d.maxHp).toBe(plain.maxHp + Math.ceil(plain.maxHp * 0.1));
    expect(d.dmgMax).toBe(plain.dmgMax + 2);
    expect(mineRatePerHour(d)).toBe(mineRatePerHour(plain) + 3);
    expect(d.healMult).toBeCloseTo(0.7);
    expect(d.expMult).toBeCloseTo(1.15);
    expect(d.regenMult).toBeCloseTo(1.5);
    expect(plain.expMult).toBe(1);
  });
});
