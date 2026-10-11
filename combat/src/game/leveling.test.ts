import { describe, expect, it } from 'vitest';

import { expForLevel, LEVEL_EXP, levelForExp, levelProgress, rewardFor } from './leveling';

describe('уровни', () => {
  it('таблица монотонна', () => {
    for (let i = 1; i < LEVEL_EXP.length; i += 1) expect(LEVEL_EXP[i]).toBeGreaterThan(LEVEL_EXP[i - 1]);
    expect(expForLevel(LEVEL_EXP.length)).toBeGreaterThan(expForLevel(LEVEL_EXP.length - 1));
  });

  it('levelForExp обратна expForLevel', () => {
    expect(levelForExp(0)).toBe(0);
    expect(levelForExp(59)).toBe(0);
    expect(levelForExp(60)).toBe(1);
    expect(levelForExp(199)).toBe(1);
    expect(levelForExp(200)).toBe(2);
    expect(levelForExp(expForLevel(15))).toBe(15);
  });

  it('прогресс в [0..1]', () => {
    expect(levelProgress(0, 0)).toBe(0);
    expect(levelProgress(0, 30)).toBeCloseTo(0.5);
    expect(levelProgress(0, 60)).toBe(1);
  });
});

describe('награда', () => {
  const rng = () => 0;
  it('победа > ничья > поражение', () => {
    const win = rewardFor('won', 0, 0, rng);
    const draw = rewardFor('draw', 0, 0, rng);
    const lose = rewardFor('lost', 0, 0, rng);
    expect(win.exp).toBeGreaterThan(draw.exp);
    expect(draw.exp).toBeGreaterThan(lose.exp);
    expect(lose.kredits).toBe(0);
  });

  it('сильный соперник даёт больше', () => {
    expect(rewardFor('won', 0, 2, rng).exp).toBeGreaterThan(rewardFor('won', 0, 0, rng).exp);
    expect(rewardFor('won', 3, 0, rng).exp).toBeLessThan(rewardFor('won', 0, 0, rng).exp);
  });
});
