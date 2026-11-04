import { describe, expect, it } from 'vitest';

import { deriveCharacter, newCharacter } from './character';
import {
  applyLoot,
  CHEST_DROP,
  CHEST_KINDS,
  CHEST_TABLES,
  CHESTS,
  emptyChests,
  giveChest,
  itemNear,
  lootIsRare,
  lootText,
  normalizeChests,
  openChest,
  rollChestDrop,
  rollLootEntry,
  totalChests,
} from './chests';
import { ITEMS_BY_ID, maxDurability } from './items';

/** Детерминированный rng: простой LCG по сиду. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('таблицы сундуков', () => {
  it('вероятности каждой таблицы дают единицу, строк столько, сколько обещано', () => {
    for (const k of CHEST_KINDS) {
      const sum = CHEST_TABLES[k].reduce((s, e) => s + e.chance, 0);
      expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
      expect(CHEST_TABLES[k].every((e) => e.chance > 0)).toBe(true);
      expect(CHESTS[k].rolls).toBeGreaterThanOrEqual(2);
    }
    expect(CHESTS.wooden.rolls).toBeLessThan(CHESTS.bound.rolls);
    expect(CHESTS.bound.rolls).toBeLessThan(CHESTS.princely.rolls);
  });

  it('каждая строка таблицы отрабатывает и описывается словами', () => {
    const rng = lcg(7);
    for (const k of CHEST_KINDS) {
      for (const e of CHEST_TABLES[k]) {
        for (let level = 0; level <= 6; level++) {
          const loot = e.roll(level, rng);
          expect(lootText(loot)).not.toMatch(/undefined|NaN/);
          if (loot.kind === 'item') expect(ITEMS_BY_ID[loot.itemId]).toBeTruthy();
          if (loot.kind === 'kredits' || loot.kind === 'resource') expect(loot.amount).toBeGreaterThan(0);
        }
      }
    }
    // Бросок по краям диапазона попадает в первую и последнюю строки.
    expect(rollLootEntry('wooden', 0, () => 0).kind).toBe('kredits');
    const seq = [0.999, 0.5, 0.5, 0.5];
    let i = 0;
    expect(rollLootEntry('wooden', 0, () => seq[i++]).kind).toBe('resource');
  });

  it('вещь из сундука — уровня игрока ±1, при spread 0 — ровно своего', () => {
    const rng = lcg(11);
    for (let level = 0; level <= 6; level++) {
      for (let n = 0; n < 50; n++) {
        const it = itemNear(level, rng);
        expect(Math.abs(it.level - level)).toBeLessThanOrEqual(1);
        expect(itemNear(level, rng, 0).level).toBe(level);
      }
    }
    // За пределами каталога уровень подрезается к краю.
    expect(itemNear(20, rng).level).toBeGreaterThanOrEqual(5);
  });

  it('содержимое: кредиты складываются в одну строку, строк не больше, чем бросков', () => {
    const rng = lcg(3);
    for (const k of CHEST_KINDS) {
      for (let n = 0; n < 30; n++) {
        const loot = openChest(k, 3, rng);
        expect(loot.length).toBeGreaterThan(0);
        expect(loot.length).toBeLessThanOrEqual(CHESTS[k].rolls);
        expect(loot.filter((l) => l.kind === 'kredits').length).toBeLessThanOrEqual(1);
      }
    }
    const allKredits = openChest('wooden', 2, () => 0);
    expect(allKredits).toHaveLength(1);
    expect(allKredits[0].kind).toBe('kredits');
  });

  it('княжеский богаче окованного, окованный — деревянного (в среднем по кредитам)', () => {
    const avg = (k: 'wooden' | 'bound' | 'princely') => {
      const rng = lcg(5);
      let sum = 0;
      for (let n = 0; n < 2000; n++) for (const l of openChest(k, 3, rng)) if (l.kind === 'kredits') sum += l.amount;
      return sum / 2000;
    };
    expect(avg('bound')).toBeGreaterThan(avg('wooden'));
    expect(avg('princely')).toBeGreaterThan(avg('bound'));
  });

  it('редкие строки подсвечиваются', () => {
    expect(lootIsRare({ kind: 'chest', chest: 'bound' })).toBe(true);
    expect(lootIsRare({ kind: 'item', itemId: 'sword', upgrade: 1 })).toBe(true);
    expect(lootIsRare({ kind: 'item', itemId: 'sword', upgrade: 0 })).toBe(false);
    expect(lootIsRare({ kind: 'resource', resource: 'relics', amount: 1 })).toBe(true);
    expect(lootIsRare({ kind: 'kredits', amount: 1000 })).toBe(false);
  });
});

describe('сундук с побеждённого', () => {
  it('малый шанс, порядок от редкого к частому, множитель события удваивает', () => {
    const total = CHEST_DROP.reduce((s, d) => s + d.chance, 0);
    expect(total).toBeLessThan(0.1);
    expect(rollChestDrop(() => 0)).toBe('princely');
    expect(rollChestDrop(() => 0.5)).toBeNull();
    expect(rollChestDrop(() => total - 0.001)).toBe('wooden');
    expect(rollChestDrop(() => total + 0.001)).toBeNull();
    expect(rollChestDrop(() => total + 0.001, 2)).toBe('wooden');
  });
});

describe('добыча в персонажа', () => {
  const uids = () => {
    let n = 0;
    return () => `u${++n}`;
  };

  it('кредиты, ресурсы, вещь с полной прочностью и заточкой, сундук', () => {
    const c = newCharacter('Тест');
    const next = applyLoot(
      c,
      [
        { kind: 'kredits', amount: 30 },
        { kind: 'resource', resource: 'ore', amount: 4 },
        { kind: 'item', itemId: 'sword', upgrade: 2 },
        { kind: 'chest', chest: 'princely' },
      ],
      uids(),
    );
    expect(next.kredits).toBe(c.kredits + 30);
    expect(next.ledger.kreditsEarned).toBe(c.ledger.kreditsEarned + 30);
    expect(next.resources.ore).toBe(4);
    expect(next.backpack).toHaveLength(1);
    expect(next.backpack[0]).toMatchObject({ uid: 'u1', itemId: 'sword', upgrade: 2, durability: maxDurability(ITEMS_BY_ID.sword) });
    expect(next.chests.princely).toBe(1);
    expect(totalChests(next.chests)).toBe(1);
  });

  it('зелье лечит до полного, а здоровому даёт травы', () => {
    const c = newCharacter('Тест');
    const hurt = { ...c, hp: 1 };
    const healed = applyLoot(hurt, [{ kind: 'heal' }], uids());
    expect(healed.hp).toBe(deriveCharacter(c).maxHp);
    const full = applyLoot(c, [{ kind: 'heal' }], uids());
    expect(full.hp).toBe(c.hp);
    expect(full.resources.herbs).toBe(c.resources.herbs + 3);
  });

  it('старый сейв без сундуков получает нули, выдача складывается', () => {
    expect(normalizeChests(undefined)).toEqual(emptyChests());
    expect(normalizeChests({ wooden: 2 })).toEqual({ wooden: 2, bound: 0, princely: 0 });
    const c = { ...newCharacter('Тест'), chests: undefined as unknown as ReturnType<typeof emptyChests> };
    const g = giveChest(giveChest(c, 'wooden'), 'wooden', 2);
    expect(g.chests).toEqual({ wooden: 3, bound: 0, princely: 0 });
    expect(totalChests(null)).toBe(0);
  });
});
