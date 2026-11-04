import { describe, expect, it } from 'vitest';

import { newCharacter } from './character';
import { dayKey } from './quests';
import { canEnterTournament, createTournament, nextRank, rankFor, RANKS, ratingDelta, TOURNAMENT_ROUNDS, tournamentLevels, tournamentPrize } from './tournament';

describe('турнир', () => {
  it('четыре соперника с нарастающим уровнем', () => {
    const t = createTournament(1, Math.random);
    expect(t.opponents).toHaveLength(TOURNAMENT_ROUNDS);
    expect(t.opponents.map((o) => o.level)).toEqual(tournamentLevels(1));
    expect(t.stage).toBe(0);
    expect(t.status).toBe('active');
  });

  it('вход раз в день и не ниже половины hp', () => {
    const c = newCharacter('Вася');
    expect(canEnterTournament(c, false).ok).toBe(true);
    expect(canEnterTournament(c, true).ok).toBe(false);
    expect(canEnterTournament({ ...c, lastTournamentDay: dayKey() }, false).ok).toBe(false);
    expect(canEnterTournament({ ...c, hp: 1 }, false).ok).toBe(false);
  });

  it('приз растёт с уровнем', () => {
    expect(tournamentPrize(2).kredits).toBeGreaterThan(tournamentPrize(0).kredits);
    expect(tournamentPrize(5).kredits).toBe(400);
    expect(tournamentPrize(0).title).toContain('Чемпион');
  });
});

describe('рейтинг', () => {
  it('звания по порогам', () => {
    expect(rankFor(0)).toBe('Новичок');
    expect(rankFor(50)).toBe('Боец');
    expect(rankFor(399)).toBe('Бретёр');
    expect(rankFor(400)).toBe('Мастер');
    expect(rankFor(800)).toBe('Чемпион');
    expect(rankFor(5000)).toBe('Имя на стене');
    expect(nextRank(40)).toEqual({ name: 'Боец', left: 10 });
    expect(nextRank(1000)).toEqual({ name: 'Легенда клуба', left: 200 });
    expect(nextRank(5000)).toBeNull();
    expect(RANKS.length).toBeGreaterThanOrEqual(10);
    for (let i = 1; i < RANKS.length; i += 1) expect(RANKS[i].min).toBeGreaterThan(RANKS[i - 1].min);
  });

  it('очки за бой', () => {
    expect(ratingDelta('won', 0, 0)).toBe(8);
    expect(ratingDelta('won', 0, 2)).toBe(16);
    expect(ratingDelta('won', 2, 0)).toBe(8);
    expect(ratingDelta('lost', 0, 0)).toBe(-4);
    expect(ratingDelta('draw', 0, 0)).toBe(1);
    expect(ratingDelta('won', 0, 0, true)).toBe(16);
  });
});
