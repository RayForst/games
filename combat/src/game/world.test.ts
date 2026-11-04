import { describe, expect, it } from 'vitest';

import { newCharacter } from './character';
import { canTravel, locationOpen, LOCATIONS, neighbours, routeBetween, travelDone, travelProgress, travelSecondsLeft } from './world';
import { ACTIVITIES, gatherRatePerHour, gatherYield, haulAfterAmbush, marketPrice, normalizeResources, oreForUpgrade, relicPriceAtCastle, ROAD_EVENTS, rollRoadEvent, WILDS, wildOpponent, woodForRepair } from './wilds';
import { baseStats, deriveStats } from './formulas';
import { jobRatePerHour, mineRatePerHour } from './mine';

const busyFree = { mining: false, gathering: false, traveling: false, fighting: false };

describe('карта мира', () => {
  it('дороги двусторонние, соседи города', () => {
    expect(routeBetween('city', 'forest')?.minutes).toBe(2);
    expect(routeBetween('forest', 'city')?.minutes).toBe(2);
    expect(routeBetween('forest', 'ruins')).toBeNull();
    expect(routeBetween('pass', 'brod')?.minutes).toBe(4);
    expect(neighbours('brod')).toEqual(['pass']);
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
    expect(canTravel(c, 'swamp', busyFree).ok).toBe(false); // с 2 уровня
    expect(canTravel({ ...c, level: 2 }, 'swamp', busyFree).ok).toBe(true);
    expect(locationOpen('ruins', 3)).toBe(false);
    expect(locationOpen('ruins', 4)).toBe(true);
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
    expect(marketPrice('pelts', '2026-11-04', 'brod')).toBeGreaterThan(marketPrice('pelts', '2026-11-04', 'city'));
    expect(jobRatePerHour('caravan', d)).toBeGreaterThan(mineRatePerHour(d));
    // Брод выгоднее Города не больше чем на треть: караван с засадой и рынок.
    expect(jobRatePerHour('caravan', d)).toBeLessThanOrEqual(Math.round(mineRatePerHour(d) * 1.3));
    expect(marketPrice('pelts', '2026-11-04', 'brod')).toBeLessThanOrEqual(Math.ceil(marketPrice('pelts', '2026-11-04', 'city') * 1.3));
  });

  it('зверь без вещей, засада меняет улов, враги руин сильнее', () => {
    const wolf = wildOpponent('forest', 0, () => 0); // первый в списке — Волк
    expect(wolf.name).toBe('Волк');
    expect(wolf.itemIds).toEqual([]);
    expect(wolf.foeIcon).toBe('wolf');
    expect(wildOpponent('ruins', 1, () => 0).level).toBe(1 + WILDS.ruins.foeLevelBonus);
    expect(haulAfterAmbush(8, true)).toBe(10);
    expect(haulAfterAmbush(8, false)).toBe(4);
    for (const w of Object.values(WILDS)) {
      expect(w.activities.length).toBeGreaterThan(0);
      expect(w.foes.length).toBeGreaterThanOrEqual(4);
      expect(new Set(w.foes.map((f) => f.name)).size).toBe(w.foes.length);
    }
  });

  it('дорожных событий много, и каждое складно сформулировано', () => {
    expect(ROAD_EVENTS.length).toBeGreaterThanOrEqual(15);
    const texts = new Set<string>();
    for (let i = 0; i < ROAD_EVENTS.length; i += 1) {
      const r = 0.75 + ((i + 0.5) / ROAD_EVENTS.length) * 0.25;
      const e = rollRoadEvent(2, (() => { let first = true; return () => { if (first) { first = false; return r; } return 0.5; }; })())!;
      expect(e.text).not.toMatch(/undefined|NaN/);
      if (e.kredits !== undefined) expect(e.kredits).not.toBe(0);
      if (e.resource) expect(e.resource.amount).toBeGreaterThan(0);
      texts.add(e.text);
    }
    expect(texts.size).toBe(ROAD_EVENTS.length);
  });

  it('дорожные события и крафт', () => {
    expect(rollRoadEvent(0, () => 0.1)).toBeNull();
    const purse = rollRoadEvent(0, (() => { const v = [0.8, 0.5]; let i = 0; return () => v[i++] ?? 0.5; })())!;
    expect(purse.kredits).toBeGreaterThan(0);
    const toll = rollRoadEvent(0, () => 0.99)!;
    expect(toll.kredits).toBeLessThan(0);
    expect(woodForRepair(10)).toBe(4);
    expect(woodForRepair(1)).toBe(1);
    expect(oreForUpgrade(18)).toBe(5);
    expect(relicPriceAtCastle('2026-11-04')).toBe(marketPrice('relics', '2026-11-04') * 2);
  });
});
