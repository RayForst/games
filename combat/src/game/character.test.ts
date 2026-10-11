import { describe, expect, it } from 'vitest';

import { applyRegen, canEquip, deriveCharacter, newCharacter, secondsToFullHp } from './character';
import { FULL_REGEN_MINUTES } from './formulas';
import { getItem } from './items';
import { chooseEnemyMove } from './ai';
import { generateArena, generateOpponent } from './opponents';
import { BLOCK_ZONES } from './types';

describe('персонаж', () => {
  it('создаётся с полным hp и стартовыми кредитами', () => {
    const c = newCharacter('Вася');
    expect(c.hp).toBe(deriveCharacter(c).maxHp);
    expect(c.kredits).toBeGreaterThan(0);
    expect(c.level).toBe(0);
  });

  it('canEquip проверяет уровень и характеристики', () => {
    const c = newCharacter('Вася');
    expect(canEquip(c, getItem('knife')).ok).toBe(true);
    expect(canEquip(c, getItem('club')).ok).toBe(false); // сила 4
    expect(canEquip(c, getItem('iron-helm')).ok).toBe(false); // 1 уровень
    const strong = { ...c, stats: { ...c.stats, strength: 4 } };
    expect(canEquip(strong, getItem('club')).ok).toBe(true);
  });

  it('регенерация полностью восстанавливает за FULL_REGEN_MINUTES', () => {
    const t0 = 1_000_000;
    const c = { ...newCharacter('Вася', undefined, 0, t0), hp: 0 };
    const half = applyRegen(c, t0 + (FULL_REGEN_MINUTES * 60 * 1000) / 2);
    const max = deriveCharacter(c).maxHp;
    expect(half.hp).toBeGreaterThanOrEqual(Math.floor(max / 2) - 1);
    expect(half.hp).toBeLessThanOrEqual(Math.ceil(max / 2));
    const full = applyRegen(c, t0 + FULL_REGEN_MINUTES * 60 * 1000 + 1);
    expect(full.hp).toBe(max);
    expect(secondsToFullHp(full, t0 + FULL_REGEN_MINUTES * 60 * 1000 + 1)).toBe(0);
  });

  it('регенерация не идёт назад во времени', () => {
    const t0 = 1_000_000;
    const c = { ...newCharacter('Вася', undefined, 0, t0), hp: 5 };
    expect(applyRegen(c, t0 - 1000).hp).toBe(5);
  });
});

describe('соперники', () => {
  it('у бота столько же очков, сколько у игрока того же уровня', () => {
    for (let level = 0; level < 5; level += 1) {
      const o = generateOpponent(level, Math.random);
      const total = Object.values(o.stats).reduce((s, v) => s + v, 0);
      expect(total).toBe(12 + 3 + level * 3);
      expect(o.derived.maxHp).toBeGreaterThan(0);
      for (const id of o.itemIds) expect(getItem(id).level).toBeLessThanOrEqual(level);
    }
  });

  it('арена: 4 соперника, уровни не ниже нуля', () => {
    const arena = generateArena(0, Math.random);
    expect(arena).toHaveLength(4);
    for (const o of arena) expect(o.level).toBeGreaterThanOrEqual(0);
    expect(new Set(arena.map((o) => o.id)).size).toBe(4);
  });
});

describe('ИИ', () => {
  it('умный бот закрывает любимую зону игрока', () => {
    const moves = Array.from({ length: 4 }, () => ({ attack: 'head' as const, block: 'belt-legs' as const }));
    // rng=0: всегда «умный» выбор и первый элемент списка.
    const m = chooseEnemyMove(10, moves, () => 0);
    expect(BLOCK_ZONES[m.block]).toContain('head');
    expect(BLOCK_ZONES['belt-legs']).not.toContain(m.attack);
  });

  it('без истории ход валиден', () => {
    const m = chooseEnemyMove(0, [], Math.random);
    expect(m.attack).toBeDefined();
    expect(m.block).toBeDefined();
  });
});
