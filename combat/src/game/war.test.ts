import { describe, expect, it } from 'vitest';

import {
  addWarPoints,
  newWar,
  normalizeWar,
  rollWarDay,
  simulateWar,
  WAR_KREDITS_MULT,
  WAR_PLAYER_POINTS,
  WAR_RATING_BONUS,
  WAR_SIM_EVERY_MS,
  WAR_SIM_MAX_BATCH,
  warAfterFight,
  warKreditsMult,
  warLeader,
  warRatingBonus,
  warSummary,
} from './war';

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe('война сторон', () => {
  it('бой игрока с чужой стороной двигает счёт, свои и ничьи — нет', () => {
    const w = newWar('2026-11-04', 0);
    expect(warAfterFight(w, 'crown', 'free', 'won').crown).toBe(WAR_PLAYER_POINTS);
    expect(warAfterFight(w, 'crown', 'free', 'lost').free).toBe(WAR_PLAYER_POINTS);
    expect(warAfterFight(w, 'crown', 'free', 'draw')).toBe(w);
    expect(warAfterFight(w, 'crown', 'crown', 'won')).toBe(w);
    expect(warAfterFight(w, 'crown', undefined, 'won')).toBe(w);
    expect(warRatingBonus('free', 'crown', 'won')).toBe(WAR_RATING_BONUS);
    expect(warRatingBonus('free', 'crown', 'lost')).toBe(0);
    expect(warRatingBonus('free', 'free', 'won')).toBe(0);
  });

  it('новый день: лидер становится победителем, счёт обнуляется, бонус к кредитам его стороне', () => {
    let w = addWarPoints(addWarPoints(newWar('d1', 0), 'free', 5), 'crown', 2);
    expect(warLeader(w)).toBe('free');
    expect(warKreditsMult(w, 'free')).toBe(1);
    expect(rollWarDay(w, 'd1')).toBe(w);
    w = rollWarDay(w, 'd2', 10);
    expect(w).toMatchObject({ day: 'd2', crown: 0, free: 0, winner: 'free', simulatedAt: 10 });
    expect(warKreditsMult(w, 'free')).toBe(WAR_KREDITS_MULT);
    expect(warKreditsMult(w, 'crown')).toBe(1);
    // Ничья — без победителя.
    expect(rollWarDay(newWar('d2', 0), 'd3').winner).toBeNull();
    expect(rollWarDay(null, 'd3').day).toBe('d3');
  });

  it('местные дерутся сами: по бою за интервал, с потолком за раз', () => {
    const w = newWar('d', 0);
    expect(simulateWar(w, WAR_SIM_EVERY_MS - 1, seq([0.1]))).toBe(w);
    const after = simulateWar(w, WAR_SIM_EVERY_MS * 10 + 5, seq([0.1, 0.9]));
    expect(after.crown + after.free).toBe(10);
    expect(after.simulatedAt).toBe(WAR_SIM_EVERY_MS * 10);
    // Остаток досчитается следующим тиком.
    const more = simulateWar(after, WAR_SIM_EVERY_MS * 11, seq([0.1]));
    expect(more.crown + more.free).toBe(11);
    const week = simulateWar(w, WAR_SIM_EVERY_MS * 1000, seq([0.5]));
    expect(week.crown + week.free).toBe(WAR_SIM_MAX_BATCH);
  });

  it('нормализация и сводка', () => {
    expect(normalizeWar(undefined, 'd', 7)).toMatchObject({ day: 'd', crown: 0, free: 0, winner: null, simulatedAt: 7 });
    expect(normalizeWar({ day: 'x', crown: 3, winner: 'nope' as unknown as 'crown' }, 'd', 7)).toMatchObject({ day: 'x', crown: 3, free: 0, winner: null });
    const names = { crown: 'Корона', free: 'Вольница' };
    expect(warSummary(newWar('d', 0), names)).toBe('Ничья 0:0');
    expect(warSummary(addWarPoints(newWar('d', 0), 'crown', 4), names)).toBe('Корона ведёт 4:0');
  });
});
