import { describe, expect, it } from 'vitest';

import { newCharacter } from './character';
import { canTravel, LOCATIONS, neighbours, routeBetween, travelDone, travelProgress, travelSecondsLeft } from './world';
import { ACTIVITIES, forestOpponent, gatherRatePerHour, gatherYield, haulAfterAmbush, marketPrice, normalizeResources } from './forest';
import { baseStats, deriveStats } from './formulas';

const busyFree = { mining: false, gathering: false, traveling: false, fighting: false };

describe('карта мира', () => {
  it('дороги двусторонние, соседи города', () => {
    expect(routeBetween('city', 'forest')?.minutes).toBe(2);
    expect(routeBetween('forest', 'city')?.minutes).toBe(2);
    expect(routeBetween('forest', 'ruins')).toBeNull();
    expect(neighbours('city')).toContain('forest');
    for (const l of LOCATIONS) {
      expect(l.x).toBeGreaterThan(0);
      expect(l.x).toBeLessThan(1);
    }
  });

  it('прогресс пути', () => {
    const t = { from: 'city' as const, to: 'forest' as const, startedAt: 0, minutes: 2 };
    expect(travelProgress(t, 60_000)).toBeCloseTo(0.5);
    expect(travelSecondsLeft(t, 60_000)).toBe(60);
    expect(travelDone(t, 119_999)).toBe(false);
    expect(travelDone(t, 120_000)).toBe(true);
  });

  it('идти можно только по дороге, в открытое место и свободным', () => {
    const c = newCharacter('Вася');
    expect(canTravel(c, 'forest', busyFree).ok).toBe(true);
    expect(canTravel(c, 'city', busyFree).ok).toBe(false);
    expect(canTravel(c, 'swamp', busyFree).ok).toBe(false);
    expect(canTravel(c, 'forest', { ...busyFree, mining: true }).ok).toBe(false);
    expect(canTravel({ ...c, location: 'forest' }, 'ruins', busyFree).ok).toBe(false); // нет дороги (и закрыто)
  });
});

describe('лес', () => {
  const d = deriveStats(baseStats(), 0, []);

  it('ставка сбора растёт от профильной характеристики', () => {
    const strong = deriveStats({ ...baseStats(), strength: 9 }, 0, []);
    expect(gatherRatePerHour('chop', strong)).toBeGreaterThan(gatherRatePerHour('chop', d));
    expect(gatherRatePerHour('herbs', strong)).toBe(gatherRatePerHour('herbs', d));
    for (const a of ACTIVITIES) expect(gatherRatePerHour(a.id, d)).toBeGreaterThan(0);
  });

  it('улов по времени и не больше смены', () => {
    const g = { activity: 'herbs' as const, startedAt: 0, minutes: 30 };
    expect(gatherYield(g, 6, 0)).toBe(0);
    expect(gatherYield(g, 6, 30 * 60_000)).toBe(3);
    expect(gatherYield(g, 6, 90 * 60_000)).toBe(3);
  });

  it('цены рынка стабильны в пределах дня и в коридоре', () => {
    expect(marketPrice('pelts', '2026-11-04')).toBe(marketPrice('pelts', '2026-11-04'));
    for (const day of ['2026-11-01', '2026-11-02', '2026-11-03']) {
      const p = marketPrice('wood', day);
      expect(p).toBeGreaterThanOrEqual(3);
      expect(p).toBeLessThanOrEqual(6);
    }
    expect(normalizeResources(undefined).wood).toBe(0);
  });

  it('зверь без вещей, засада меняет улов', () => {
    const wolf = forestOpponent(0, () => 0); // первый в списке — Волк
    expect(wolf.name).toBe('Волк');
    expect(wolf.itemIds).toEqual([]);
    expect(haulAfterAmbush(8, true)).toBe(10);
    expect(haulAfterAmbush(8, false)).toBe(4);
  });
});
