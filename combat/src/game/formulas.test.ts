import { describe, expect, it } from 'vitest';

import { baseStats, critChance, deriveStats, dodgeChance, rollDamage, statPointsTotal } from './formulas';
import { ITEMS } from './items';

describe('deriveStats', () => {
  it('голый персонаж 0 уровня', () => {
    const d = deriveStats(baseStats(), 0, []);
    expect(d.maxHp).toBe(12 + 3 * 6);
    expect(d.dmgMin).toBe(1 + 1);
    expect(d.dmgMax).toBe(3 + 3);
    expect(d.crit).toBe(9);
    expect(d.dodge).toBe(9);
    expect(d.armor).toEqual({ head: 0, body: 0, belt: 0, legs: 0 });
  });

  it('оружие заменяет кулаки, броня и бонусы складываются', () => {
    const d = deriveStats(baseStats(), 1, ['knife', 'cap', 'jacket', 'leather-gloves']);
    expect(d.dmgMin).toBe(2 + 1);
    expect(d.dmgMax).toBe(4 + 3);
    expect(d.armor.head).toBe(1);
    expect(d.armor.body).toBe(1);
    expect(d.stats.dexterity).toBe(4);
    expect(d.dodge).toBe(4 * 3);
  });

  it('у каждого предмета валидные поля', () => {
    const ids = new Set<string>();
    for (const item of ITEMS) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(item.price).toBeGreaterThan(0);
      expect(item.level).toBeGreaterThanOrEqual(0);
      if (item.slot === 'weapon') {
        expect(item.damage).toBeDefined();
        expect(item.damage![0]).toBeLessThanOrEqual(item.damage![1]);
      } else {
        expect(item.damage).toBeUndefined();
      }
    }
  });
});

describe('шансы', () => {
  const a = deriveStats({ strength: 3, dexterity: 3, intuition: 10, endurance: 3 }, 0, []);
  const d = deriveStats(baseStats(), 0, []);

  it('интуиция поднимает крит, ловкость защищает', () => {
    expect(critChance(a, d)).toBeGreaterThan(critChance(d, d));
    expect(dodgeChance(a, d)).toBeLessThan(dodgeChance(d, d));
  });

  it('шансы зажаты в коридор 2..60', () => {
    const god = deriveStats({ strength: 3, dexterity: 3, intuition: 99, endurance: 3 }, 0, []);
    expect(critChance(god, d)).toBe(60);
    expect(critChance(d, god)).toBeGreaterThanOrEqual(2);
  });
});

describe('rollDamage', () => {
  const a = deriveStats(baseStats(), 0, ['sword']);
  const tank = deriveStats(baseStats(), 0, ['plate']);

  it('урон в диапазоне и не ниже 1 даже сквозь броню', () => {
    for (let i = 0; i < 200; i += 1) {
      const dmg = rollDamage(a, tank, 'chest', false, Math.random);
      expect(dmg).toBeGreaterThanOrEqual(1);
      expect(dmg).toBeLessThanOrEqual(a.dmgMax);
    }
  });

  it('крит удваивает и игнорирует половину брони', () => {
    const rngMax = () => 0.999999;
    const normal = rollDamage(a, tank, 'chest', false, rngMax);
    const crit = rollDamage(a, tank, 'chest', true, rngMax);
    expect(normal).toBe(a.dmgMax - tank.armor.body);
    expect(crit).toBe(a.dmgMax * 2 - Math.floor(tank.armor.body / 2));
  });
});

describe('statPointsTotal', () => {
  it('растёт на 3 за уровень', () => {
    expect(statPointsTotal(1) - statPointsTotal(0)).toBe(3);
  });
});
