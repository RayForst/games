import { describe, expect, it } from 'vitest';

import { deriveStats } from './formulas';
import { ITEMS_BY_ID } from './items';
import { generateArena, generateOpponent } from './opponents';
import { STAT_KEYS } from './types';

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('экипировка ботов', () => {
  it('требования вещей считаются с учётом уже надетого — как у игрока', () => {
    const rng = seeded(7);
    for (let i = 0; i < 200; i += 1) {
      const o = generateOpponent(5, rng, new Set(), 1);
      const eff = deriveStats(o.stats, o.level, o.itemIds).stats;
      for (const id of o.itemIds) {
        const req = ITEMS_BY_ID[id].requires ?? {};
        for (const k of STAT_KEYS) expect(eff[k]).toBeGreaterThanOrEqual(req[k] ?? 0);
      }
    }
  });

  it('где вещей своего уровня нет, бот берёт лучшие из доступных, а не случайные', () => {
    // Перчатки: кожаные (0), с шипами (1), железные (2). На 4-м уровне полосы 3–4 нет — должны быть железные.
    const rng = seeded(11);
    let gloves = 0;
    for (let i = 0; i < 200; i += 1) {
      const o = generateOpponent(4, rng, new Set(), 1);
      const g = o.itemIds.map((id) => ITEMS_BY_ID[id]).find((it) => it.slot === 'gloves');
      if (!g) continue;
      gloves += 1;
      expect(g.id).toBe('iron-gloves');
    }
    expect(gloves).toBeGreaterThan(50);
  });

  it('с 5-го уровня равный бот одет почти полностью, щит и двуручник не вместе', () => {
    const rng = seeded(3);
    let pieces = 0;
    let n = 0;
    for (let i = 0; i < 100; i += 1) {
      for (const o of generateArena(5, rng).slice(1, 3)) {
        n += 1;
        pieces += o.itemIds.length;
        const defs = o.itemIds.map((id) => ITEMS_BY_ID[id]);
        const twoHanded = defs.some((it) => it.twoHanded);
        const shield = defs.some((it) => it.slot === 'shield');
        expect(twoHanded && shield).toBe(false);
      }
    }
    expect(pieces / n).toBeGreaterThan(7);
  });
});
