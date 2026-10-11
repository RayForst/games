import { describe, expect, it } from 'vitest';

import { describeStrike, resolveStrike, resolveTurn } from './combat';
import { baseStats, deriveStats } from './formulas';
import type { Fighter } from './types';

const mk = (name: string, itemIds: string[] = []): Fighter => ({ name, level: 0, derived: deriveStats(baseStats(), 0, itemIds) });

/** rng, который возвращает значения из очереди (а после — 0.5). */
const seq = (...values: number[]) => {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0.5);
};

describe('resolveStrike', () => {
  const a = mk('Вася', ['knife']);
  const d = mk('Петя');

  it('блок закрывает две зоны', () => {
    // Первый бросок — проверка крита сквозь блок, 0.99 → не крит.
    const r = resolveStrike(a, d, 'head', 'head-chest', seq(0.99));
    expect(r.outcome).toBe('blocked');
    expect(r.damage).toBe(0);
    const r2 = resolveStrike(a, d, 'chest', 'head-chest', seq(0.99));
    expect(r2.outcome).toBe('blocked');
    const r3 = resolveStrike(a, d, 'legs', 'head-chest', seq(0.99, 0.99, 0.5));
    expect(r3.outcome).toBe('hit');
    expect(r3.damage).toBeGreaterThan(0);
  });

  it('крит пробивает блок', () => {
    const r = resolveStrike(a, d, 'head', 'head-chest', seq(0.0, 0.5));
    expect(r.outcome).toBe('crit-through-block');
    expect(r.damage).toBeGreaterThan(0);
  });

  it('уворот и крит в открытую зону', () => {
    expect(resolveStrike(a, d, 'legs', 'head-chest', seq(0.0)).outcome).toBe('dodged');
    expect(resolveStrike(a, d, 'legs', 'head-chest', seq(0.99, 0.0, 0.5)).outcome).toBe('crit');
  });
});

describe('resolveTurn', () => {
  const a = mk('Вася', ['battle-axe']);
  const d = mk('Петя');

  it('оба бьют одновременно, возможна ничья', () => {
    const alwaysHitMax = () => 0.999999;
    const r = resolveTurn(a, a, 1, 1, { attack: 'legs', block: 'head-chest' }, { attack: 'legs', block: 'head-chest' }, alwaysHitMax);
    expect(r.status).toBe('draw');
    expect(r.playerHp).toBe(0);
    expect(r.enemyHp).toBe(0);
  });

  it('победа, когда падает только соперник', () => {
    const r = resolveTurn(a, d, 100, 1, { attack: 'legs', block: 'head-chest' }, { attack: 'legs', block: 'head-chest' }, () => 0.999999);
    expect(r.status).toBe('won');
    expect(r.strikes[0].attacker).toBe('player');
    expect(r.strikes[0].defenderHpAfter).toBe(0);
  });

  it('бой продолжается, пока у обоих есть hp', () => {
    const r = resolveTurn(a, d, 100, 100, { attack: 'legs', block: 'head-chest' }, { attack: 'legs', block: 'head-chest' }, () => 0.999999);
    expect(r.status).toBe('active');
    expect(r.enemyHp).toBeLessThan(100);
    expect(r.playerHp).toBeLessThan(100);
  });
});

describe('describeStrike', () => {
  it('формирует текст в стиле БК', () => {
    expect(describeStrike('Вася', 'Петя', { zone: 'head', outcome: 'blocked', damage: 0 })).toBe(
      'Вася пытается ударить в голову, но Петя ставит блок.',
    );
    expect(describeStrike('Вася', 'Петя', { zone: 'legs', outcome: 'crit', damage: 12 })).toContain('Критический удар!');
    expect(describeStrike('Вася', 'Петя', { zone: 'belly', outcome: 'hit', damage: 5 })).toBe('Вася наносит удар в живот: −5');
  });
});
