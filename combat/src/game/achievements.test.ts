import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS, claimableAchievements, emptyLedger, ledgerAfterFight, normalizeLedger } from './achievements';
import { newCharacter, newInventoryItem } from './character';
import { SLOTS } from './types';

describe('счётчики', () => {
  it('серия побед растёт и обрывается', () => {
    let l = emptyLedger();
    l = ledgerAfterFight(l, true);
    l = ledgerAfterFight(l, true);
    expect(l.streak).toBe(2);
    l = ledgerAfterFight(l, false);
    expect(l.streak).toBe(0);
    expect(l.bestStreak).toBe(2);
    expect(l.fightsTotal).toBe(3);
  });

  it('старый сейв без счётчиков получает нули', () => {
    expect(normalizeLedger(undefined).crits).toBe(0);
    expect(normalizeLedger({ crits: 5 }).crits).toBe(5);
  });
});

describe('достижения', () => {
  it('у нового персонажа ничего не выполнено, после победы — первая кровь', () => {
    const c = newCharacter('Вася');
    expect(claimableAchievements(c)).toHaveLength(0);
    expect(claimableAchievements({ ...c, wins: 1 }).map((a) => a.id)).toEqual(['first-blood']);
    expect(claimableAchievements({ ...c, wins: 1, achievements: ['first-blood'] })).toHaveLength(0);
  });

  it('полный комплект и остриё', () => {
    const c = newCharacter('Вася');
    const backpack = SLOTS.map((s, i) => ({ ...newInventoryItem(`u${i}`, 'knife'), upgrade: i === 0 ? 3 : 0 }));
    const equipment = Object.fromEntries(SLOTS.map((s, i) => [s, `u${i}`])) as typeof c.equipment;
    const ids = claimableAchievements({ ...c, backpack, equipment }).map((a) => a.id);
    expect(ids).toContain('full-set');
    expect(ids).toContain('sharp-3');
  });

  it('у всех достижений уникальные id и награда', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) expect(a.reward).toBeGreaterThan(0);
  });
});
