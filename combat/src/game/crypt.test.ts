import { describe, expect, it } from 'vitest';

import { CRYPT, CRYPT_FLOORS, cryptAfterWin, cryptBones, cryptCleared, cryptLevel, cryptOpponent, newCrypt, nextFloor, normalizeCrypt } from './crypt';

describe('склеп', () => {
  it('пять ярусов, враги по этажу и уровню игрока, кости растут вглубь', () => {
    expect(CRYPT.length).toBe(CRYPT_FLOORS);
    expect(CRYPT.map((f) => f.floor)).toEqual([1, 2, 3, 4, 5]);
    expect(cryptLevel(1, 0)).toBe(0); // не ниже нуля
    expect(cryptLevel(1, 3)).toBe(2);
    expect(cryptLevel(5, 3)).toBe(4);
    for (let i = 1; i < CRYPT.length; i += 1) expect(CRYPT[i].bones[0]).toBeGreaterThanOrEqual(CRYPT[i - 1].bones[0]);
    for (const f of CRYPT) {
      expect(f.foes.length).toBeGreaterThanOrEqual(3);
      expect(new Set(f.foes.map((x) => x.name)).size).toBe(f.foes.length);
    }
    expect(cryptBones(1, () => 0)).toBe(2);
    expect(cryptBones(1, () => 0.99)).toBe(4);
    expect(cryptBones(5, () => 0.99)).toBe(10);
  });

  it('нежить без стороны, скелеты голые, латники одеты, у всех +1 брони', () => {
    const skeleton = cryptOpponent(1, 2, () => 0); // первый в списке яруса — голый
    expect(skeleton.name).toBe('Скелет');
    expect(skeleton.itemIds).toEqual([]);
    expect(skeleton.side).toBeUndefined();
    expect(skeleton.race).toBeUndefined();
    expect(skeleton.level).toBe(cryptLevel(1, 2));
    expect(skeleton.derived.armor.head).toBeGreaterThanOrEqual(1);
    expect(skeleton.foeIcon).toBe('skull');
    // Латник с 5-го яруса: ищем одетого за несколько бросков.
    let armored = 0;
    let rngSeed = 1;
    const rng = () => {
      rngSeed = (rngSeed * 48271) % 2147483647;
      return rngSeed / 2147483647;
    };
    for (let i = 0; i < 40; i += 1) {
      const o = cryptOpponent(4, 5, rng);
      expect(o.level).toBe(6);
      if (o.itemIds.length > 0) armored += 1;
    }
    expect(armored).toBeGreaterThan(0);
  });

  it('спуск: ярус за ярусом, в полночь заново', () => {
    let s = newCrypt('2026-11-04');
    expect(nextFloor(s)).toBe(1);
    expect(cryptCleared(s)).toBe(false);
    s = cryptAfterWin(s, 1);
    expect(s.floor).toBe(1);
    // Повторная победа над пройденным ярусом или прыжок через ярус ничего не двигают.
    expect(cryptAfterWin(s, 1).floor).toBe(1);
    expect(cryptAfterWin(s, 3).floor).toBe(1);
    for (let f = 2; f <= CRYPT_FLOORS; f += 1) s = cryptAfterWin(s, f);
    expect(cryptCleared(s)).toBe(true);
    expect(nextFloor(s)).toBeNull();
    expect(normalizeCrypt(s, '2026-11-04').floor).toBe(5);
    expect(normalizeCrypt(s, '2026-11-05').floor).toBe(0);
    expect(normalizeCrypt(undefined, '2026-11-05')).toEqual({ day: '2026-11-05', floor: 0 });
    expect(normalizeCrypt({ day: '2026-11-05', floor: 99 }, '2026-11-05').floor).toBe(5);
  });
});
