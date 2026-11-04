import { describe, expect, it } from 'vitest';

import { defect, deriveCharacter, newCharacter, normalizeCharacter, rollInjury } from './character';
import { baseStats, deriveStats } from './formulas';
import { generateArena, generateOpponent } from './opponents';
import { RIVALS, rivalOpponent } from './rivals';
import { DEFECT_COST, defectCost, isValidOrigin, RACES, RACES_BY_ID, raceStats, racesOf, SIDES, switchRaceStats } from './races';
import type { Character } from './types';

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe('стороны и расы', () => {
  it('две стороны по три расы, расы не пересекаются', () => {
    expect(SIDES.map((s) => s.id)).toEqual(['crown', 'free']);
    for (const s of SIDES) {
      expect(s.races).toHaveLength(3);
      for (const r of racesOf(s.id)) expect(r.side).toBe(s.id);
    }
    expect(RACES).toHaveLength(6);
    expect(new Set(RACES.map((r) => r.id)).size).toBe(6);
    expect(isValidOrigin('crown', 'orc')).toBe(false);
    expect(isValidOrigin('free', 'orc')).toBe(true);
  });

  it('+1 к характеристике расы при создании', () => {
    const stats = raceStats(baseStats(), 'karl');
    expect(stats.endurance).toBe(4);
    expect(stats.strength).toBe(3);
    const c = newCharacter('Я', raceStats(baseStats(), 'orc'), 0, 1000, { side: 'free', race: 'orc' });
    expect(c.side).toBe('free');
    expect(c.race).toBe('orc');
    expect(c.stats.strength).toBe(4);
    expect(c.defections).toBe(0);
  });

  it('расовые черты ложатся на производные характеристики', () => {
    const plain = deriveStats(baseStats(), 0, []);
    expect(plain.injuryMult).toBe(1);
    expect(deriveStats(baseStats(), 0, [], [], 'human').expMult).toBeCloseTo(1.1);
    expect(deriveStats(baseStats(), 0, [], [], 'karl').mineBonus).toBe(4);
    expect(deriveStats(baseStats(), 0, [], [], 'halfblood').regenMult).toBeCloseTo(1.25);
    expect(deriveStats(baseStats(), 0, [], [], 'steppe').dodge).toBe(plain.dodge + 3);
    const orc = deriveStats(baseStats(), 0, [], [], 'orc');
    expect(orc.armor.body).toBe(1);
    expect(orc.armor.belt).toBe(1);
    expect(orc.armor.head).toBe(0);
    expect(deriveStats(baseStats(), 0, [], [], 'bog').injuryMult).toBe(0.5);
    // Черта приходит через персонажа.
    const c = newCharacter('Я', baseStats(), 0, 1000, { side: 'crown', race: 'karl' });
    expect(deriveCharacter(c).mineBonus).toBe(4);
  });

  it('болотник: травма вдвое короче', () => {
    const now = 1_000_000;
    const full = rollInjury('lost', seq([0, 0, 0]), now, 1)!;
    const half = rollInjury('lost', seq([0, 0, 0]), now, 0.5)!;
    expect(half.until - now).toBe((full.until - now) / 2);
  });

  it('перебежчик: расовый +1 переезжает, счётчик растёт, цена после первого раза', () => {
    const c = newCharacter('Я', raceStats(baseStats(), 'human'), 0, 1000, { side: 'crown', race: 'human' });
    expect(c.stats.strength).toBe(4);
    const d = defect(c, 'free', 'bog');
    expect(d.side).toBe('free');
    expect(d.race).toBe('bog');
    expect(d.stats.strength).toBe(3);
    expect(d.stats.endurance).toBe(4);
    expect(d.defections).toBe(1);
    // Та же характеристика у обеих рас — очки не трогаем.
    expect(switchRaceStats(c.stats, 'human', 'orc')).toEqual(c.stats);
    // Чужая раса для стороны — без изменений.
    expect(defect(c, 'crown', 'orc')).toBe(c);
    expect(defectCost(0)).toBe(0);
    expect(defectCost(1)).toBe(DEFECT_COST);
  });

  it('старый сейв получает Корону, Людей и расовый +1', () => {
    const legacy = { ...newCharacter('Старый') } as Partial<Character>;
    delete legacy.side;
    delete legacy.race;
    delete legacy.defections;
    const fixed = normalizeCharacter(legacy as Character);
    expect(fixed.side).toBe('crown');
    expect(fixed.race).toBe('human');
    expect(fixed.defections).toBe(0);
    expect(fixed.stats.strength).toBe(4);
    // Повторная нормализация +1 не дублирует.
    expect(normalizeCharacter(fixed).stats.strength).toBe(4);
  });

  it('у ботов и именных есть сторона, раса — из её списка', () => {
    const rng = seq([0.7, 0.2, 0.9, 0.4, 0.1, 0.6, 0.3, 0.8]);
    for (const o of generateArena(2, rng)) {
      expect(o.side).toBeDefined();
      expect(RACES_BY_ID[o.race!].side).toBe(o.side);
    }
    const forced = generateOpponent(1, rng, new Set(), 1, undefined, { side: 'free' });
    expect(forced.side).toBe('free');
    for (const def of RIVALS) {
      expect(RACES_BY_ID[def.race].side).toBe(def.side);
      const o = rivalOpponent(def, 2, rng);
      expect(o.side).toBe(def.side);
      expect(o.race).toBe(def.race);
    }
    expect(RIVALS.filter((r) => r.side === 'crown').map((r) => r.id).sort()).toEqual(['bart', 'nyura', 'soldier']);
  });
});
