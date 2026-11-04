import { describe, expect, it } from 'vitest';

import { newCharacter } from './character';
import { generateArena } from './opponents';
import { pickRival, rivalLine, rivalOpponent, RIVALS, RIVALS_BY_ID, rivalRecord, rivalTaunt } from './rivals';

describe('именные соперники', () => {
  it('новичку достаётся Толян, потом тот, с кем меньше дрались', () => {
    const c = newCharacter('Вася');
    expect(pickRival(c, Math.random).id).toBe('tolyan');
    const seasoned = { ...c, wins: 3, rivals: { tolyan: { wins: 3, losses: 0 } } };
    for (let i = 0; i < 20; i += 1) expect(pickRival(seasoned, Math.random).id).not.toBe('tolyan');
  });

  it('соперник собирается с характером и попадает первым в зал', () => {
    const def = RIVALS_BY_ID.soldier;
    const o = rivalOpponent(def, 2, Math.random);
    expect(o.name).toBe(def.name);
    expect(o.rivalId).toBe('soldier');
    expect(o.level).toBe(3);
    const arena = generateArena(2, Math.random, o);
    expect(arena[0].rivalId).toBe('soldier');
    expect(arena).toHaveLength(4);
    expect(new Set(arena.map((x) => x.name)).size).toBe(4);
  });

  it('реплики и счёт', () => {
    for (const r of RIVALS) {
      expect(rivalTaunt(r, () => 0)).toBeTruthy();
      expect(rivalLine(r, true, () => 0)).toBe(r.excuses[0]);
      expect(rivalLine(r, false, () => 0)).toBe(r.gloats[0]);
    }
    expect(rivalRecord(newCharacter('Вася'), 'bart')).toEqual({ wins: 0, losses: 0 });
  });
});
