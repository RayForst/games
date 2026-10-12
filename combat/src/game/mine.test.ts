import { describe, expect, it } from 'vitest';

import { baseStats, deriveStats } from './formulas';
import { mineEarnings, mineIsDone, mineProgress, mineRatePerHour, mineSecondsLeft, isShiftHours } from './mine';
import { BUILDINGS } from './city';

const HOUR = 3_600_000;

describe('шахта', () => {
  const d = deriveStats(baseStats(), 0, []);
  const rate = mineRatePerHour(d);

  it('ставка растёт от силы и выносливости', () => {
    const strong = deriveStats({ ...baseStats(), strength: 8 }, 0, []);
    expect(mineRatePerHour(strong)).toBeGreaterThan(rate);
    expect(rate).toBeGreaterThan(0);
  });

  it('заработок пропорционален времени и не превышает смену', () => {
    const m = { startedAt: 1000, hours: 4 };
    expect(mineEarnings(m, rate, 1000)).toBe(0);
    expect(mineEarnings(m, rate, 1000 + HOUR)).toBe(rate);
    expect(mineEarnings(m, rate, 1000 + 4 * HOUR)).toBe(rate * 4);
    expect(mineEarnings(m, rate, 1000 + 40 * HOUR)).toBe(rate * 4);
    expect(mineEarnings(m, rate, 0)).toBe(0);
  });

  it('прогресс, остаток и завершение', () => {
    const m = { startedAt: 0, hours: 1 };
    expect(mineProgress(m, HOUR / 2)).toBeCloseTo(0.5);
    expect(mineSecondsLeft(m, HOUR / 2)).toBe(1800);
    expect(mineIsDone(m, HOUR - 1)).toBe(false);
    expect(mineIsDone(m, HOUR)).toBe(true);
    expect(mineSecondsLeft(m, HOUR + 5)).toBe(0);
  });

  it('допустимые смены', () => {
    expect(isShiftHours(4)).toBe(true);
    expect(isShiftHours(3)).toBe(false);
  });
});

describe('город', () => {
  it('точки заведений внутри картинки и идут слева направо', () => {
    for (const b of BUILDINGS) {
      expect(b.x).toBeGreaterThan(0);
      expect(b.x).toBeLessThan(1);
      expect(b.y).toBeGreaterThan(0);
      expect(b.y).toBeLessThan(1);
    }
    for (let i = 1; i < BUILDINGS.length; i += 1) expect(BUILDINGS[i].x).toBeGreaterThan(BUILDINGS[i - 1].x);
    expect(new Set(BUILDINGS.map((b) => b.id)).size).toBe(BUILDINGS.length);
  });
});
