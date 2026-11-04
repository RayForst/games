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
    const owned = PERKS.slice(0, PERKS.length - 2).map((p) => p.id);
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
    const extra = deriveStats(baseStats(), 0, [], ['cat-step', 'long-arm', 'bull-neck', 'oak-legs', 'cold-blood', 'brawler', 'tough-hide', 'light-sleeper', 'coal-lungs', 'tavern-regular', 'rat-cunning']);
    expect(extra.antiCrit).toBe(plain.antiCrit + 5);
    expect(extra.antiDodge).toBe(plain.antiDodge + 3);
    expect(extra.armor.body).toBe(plain.armor.body + 3);
    expect(extra.armor.legs).toBe(plain.armor.legs + 2);
    expect(extra.crit).toBe(plain.crit + 4);
    expect(extra.dodge).toBe(plain.dodge);
    expect(extra.dmgMax).toBe(plain.dmgMax + 2);
    expect(extra.mineBonus).toBe(2);
    expect(extra.regenMult).toBeCloseTo(1.25);
    expect(extra.expMult).toBeCloseTo(1.08);
    expect(extra.healMult).toBeCloseTo(0.9);
  });

  it('умений хватает на все окна выбора с запасом', () => {
    expect(PERKS.length).toBeGreaterThanOrEqual(PERK_LEVELS.length * 3);
    expect(new Set(PERKS.map((p) => p.id)).size).toBe(PERKS.length);
  });
});
