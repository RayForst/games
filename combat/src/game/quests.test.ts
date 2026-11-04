import { describe, expect, it } from 'vitest';

import { applyQuestEvent, dailyRumors, dayKey, generateBoard, questDone, questReward, questTitle } from './quests';

describe('задания', () => {
  const now = new Date(2026, 10, 4, 12).getTime();

  it('доска из трёх разных заданий на сегодня', () => {
    const b = generateBoard(Math.random, now);
    expect(b.day).toBe(dayKey(now));
    expect(b.quests).toHaveLength(3);
    expect(new Set(b.quests.map((q) => q.templateId)).size).toBe(3);
    for (const q of b.quests) expect(questTitle(q)).toBeTruthy();
  });

  it('событие двигает прогресс до цели, чужой день не трогает', () => {
    const b = generateBoard(() => 0, now); // первые шаблоны: win 2
    const win = b.quests.find((q) => q.event === 'fightWin')!;
    expect(win.target).toBe(2);
    const after = applyQuestEvent(applyQuestEvent(b, 'fightWin', 1, now), 'fightWin', 5, now);
    const q = after.quests.find((x) => x.event === 'fightWin')!;
    expect(q.progress).toBe(2);
    expect(questDone(q)).toBe(true);
    const tomorrow = now + 24 * 3600_000;
    expect(applyQuestEvent(b, 'fightWin', 1, tomorrow)).toBe(b);
  });

  it('награда растёт с уровнем', () => {
    const q = generateBoard(() => 0, now).quests[0];
    expect(questReward(q, 3).kredits).toBeGreaterThan(questReward(q, 0).kredits);
    expect(questReward(q, 0).exp).toBeGreaterThan(0);
  });

  it('слухи стабильны в пределах дня', () => {
    expect(dailyRumors('2026-11-04')).toEqual(dailyRumors('2026-11-04'));
    expect(dailyRumors('2026-11-04')).toHaveLength(3);
    expect(new Set(dailyRumors('2026-11-04')).size).toBe(3);
  });
});
