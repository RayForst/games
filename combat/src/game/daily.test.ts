import { describe, expect, it } from 'vitest';

import {
  applyWeeklyEvent,
  claimDailyState,
  DAILY_CHAIN,
  DAILY_DAYS,
  dailyClaimed,
  dailyGift,
  dailyRewind,
  generateWeekly,
  newDaily,
  nextDailyDay,
  normalizeDaily,
  STREAK_STEPS,
  streakBonusMult,
  streakStepReached,
  weekDaysLeft,
  weekKey,
  WEEKLY_TEMPLATES,
  weeklyChest,
  weeklyDone,
  weeklyTitle,
  type DailyState,
} from './daily';
import { shiftDay } from './events';
import { dayKey } from './quests';

const D0 = '2026-11-02';
const day = (n: number) => shiftDay(D0, n);

/** Забрать подряд `n` дней начиная с D0. */
function claimDays(n: number, start = 0, state: DailyState = newDaily()): DailyState {
  let s = state;
  for (let i = 0; i < n; i++) s = claimDailyState(s, 0, Math.random, day(start + i))!.state;
  return s;
}

describe('награда за вход', () => {
  it('цепочка из семи дней, после седьмого — заново', () => {
    expect(DAILY_CHAIN).toHaveLength(DAILY_DAYS);
    expect(DAILY_CHAIN.map((g) => g.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    let s = newDaily();
    expect(nextDailyDay(s, day(0))).toBe(1);
    for (let i = 0; i < 7; i++) {
      const r = claimDailyState(s, 1, Math.random, day(i))!;
      expect(r.day).toBe(i + 1);
      s = r.state;
      expect(dailyClaimed(s, day(i))).toBe(true);
      expect(claimDailyState(s, 1, Math.random, day(i))).toBeNull();
    }
    expect(s.streak).toBe(7);
    expect(nextDailyDay(s, day(7))).toBe(1);
  });

  it('пропуск одного дня откатывает на день назад, двух и больше — на начало', () => {
    const five = claimDays(5); // забраны дни 1..5 (2–6 ноября)
    expect(five.streak).toBe(5);
    expect(nextDailyDay(five, day(5))).toBe(6); // пришёл назавтра
    expect(nextDailyDay(five, day(6))).toBe(5); // пропустил один: пятый день заново
    expect(nextDailyDay(five, day(7))).toBe(1); // пропустил два: с начала
    expect(nextDailyDay(five, day(30))).toBe(1);
    const afterSkip = claimDailyState(five, 0, Math.random, day(6))!;
    expect(afterSkip.day).toBe(5);
    expect(nextDailyDay(afterSkip.state, day(7))).toBe(6);
    // Первый день пропустить «на день назад» нельзя ниже первого.
    const one = claimDays(1);
    expect(nextDailyDay(one, day(2))).toBe(1);
    // После седьмого дня пропуск одного дня даёт шестой, а не восьмой.
    const seven = claimDays(7);
    expect(nextDailyDay(seven, day(8))).toBe(6);
  });

  it('подарки: первый день — кредиты по уровню, третий — зелье, седьмой — окованный сундук', () => {
    const r0 = claimDailyState(newDaily(), 0, Math.random, day(0))!;
    const r3 = claimDailyState(newDaily(), 3, Math.random, day(0))!;
    expect(r0.loot[0]).toMatchObject({ kind: 'kredits', amount: 20 });
    expect(r3.loot[0]).toMatchObject({ kind: 'kredits', amount: 50 });
    expect(dailyGift(3).roll(0, Math.random)[0].kind).toBe('heal');
    expect(dailyGift(6).roll(2, Math.random)[0].kind).toBe('item');
    expect(dailyGift(7).roll(0, Math.random)[0]).toEqual({ kind: 'chest', chest: 'bound' });
    expect(dailyGift(99).day).toBe(7);
    expect(dailyGift(-1).day).toBe(1);
  });

  it('нормализация старого сейва и откат мастера игры', () => {
    expect(normalizeDaily(undefined)).toEqual(newDaily());
    expect(normalizeDaily({ streak: 42 }).streak).toBe(DAILY_DAYS);
    const s = claimDays(2);
    const back = dailyRewind(s);
    expect(back.lastClaimDay).toBe(day(0));
    expect(dailyClaimed(back, day(1))).toBe(false);
    expect(nextDailyDay(back, day(1))).toBe(3);
    expect(dailyRewind(newDaily())).toEqual(newDaily());
  });
});

describe('серия побед', () => {
  it('множитель растёт по порогам и не падает между ними', () => {
    expect(streakBonusMult(0)).toBe(1);
    expect(streakBonusMult(2)).toBe(1);
    expect(streakBonusMult(3)).toBe(1.1);
    expect(streakBonusMult(4)).toBe(1.1);
    expect(streakBonusMult(5)).toBe(1.2);
    expect(streakBonusMult(10)).toBe(1.3);
    expect(streakBonusMult(100)).toBe(1.3);
    expect(streakStepReached(3)).toBe(3);
    expect(streakStepReached(4)).toBeNull();
    expect(STREAK_STEPS.map((s) => s.mult)).toEqual([...STREAK_STEPS.map((s) => s.mult)].sort((a, b) => a - b));
  });
});

describe('цели недели', () => {
  const wed = new Date(2026, 10, 4, 12).getTime();
  const sun = new Date(2026, 10, 8, 12).getTime();
  const mon = new Date(2026, 10, 9, 12).getTime();

  it('неделя считается с понедельника', () => {
    expect(dayKey(wed)).toBe('2026-11-04');
    expect(weekKey(wed)).toBe('2026-11-02');
    expect(weekKey(sun)).toBe('2026-11-02');
    expect(weekKey(mon)).toBe('2026-11-09');
    expect(weekDaysLeft(mon)).toBe(7);
    expect(weekDaysLeft(sun)).toBe(1);
    expect(weekDaysLeft(wed)).toBe(5);
  });

  it('три разные цели, прогресс по событию, чужая неделя не меняется', () => {
    const b = generateWeekly(Math.random, wed);
    expect(b.week).toBe('2026-11-02');
    expect(b.goals).toHaveLength(3);
    expect(new Set(b.goals.map((g) => g.templateId)).size).toBe(3);
    expect(new Set(b.goals.map((g) => g.event)).size).toBe(3);
    for (const g of b.goals) {
      expect(weeklyTitle(g)).not.toMatch(/undefined|NaN/);
      expect(['wooden', 'bound', 'princely']).toContain(weeklyChest(g));
    }
    const first = generateWeekly(() => 0, wed); // первый шаблон — бои, цель 15
    const g = first.goals.find((x) => x.event === 'fightPlay')!;
    expect(g.target).toBe(15);
    const after = applyWeeklyEvent(applyWeeklyEvent(first, 'fightPlay', 10, wed), 'fightPlay', 10, wed);
    const done = after.goals.find((x) => x.event === 'fightPlay')!;
    expect(done.progress).toBe(15);
    expect(weeklyDone(done)).toBe(true);
    expect(applyWeeklyEvent(first, 'fightPlay', 1, mon)).toBe(first);
    expect(applyWeeklyEvent(first, 'fightPlay', 0, wed)).toBe(first);
    expect(applyWeeklyEvent(first, 'skirmish', 1, wed)).toBe(first);
  });

  it('шаблонов хватает, у всех есть сундук и целые формулировки', () => {
    expect(WEEKLY_TEMPLATES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(WEEKLY_TEMPLATES.map((t) => t.id)).size).toBe(WEEKLY_TEMPLATES.length);
    for (const t of WEEKLY_TEMPLATES) for (const n of t.targets) expect(t.title(n)).not.toMatch(/undefined|NaN/);
    expect(WEEKLY_TEMPLATES.some((t) => t.event === 'skirmish')).toBe(true);
    expect(WEEKLY_TEMPLATES.some((t) => t.chest === 'princely')).toBe(true);
  });
});
