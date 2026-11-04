import { describe, expect, it } from 'vitest';

import { makeLogLine } from './combat';
import {
  advanceSteps,
  currentStep,
  fightHighlight,
  firstSeen,
  hintFor,
  hitStreak,
  newTutorial,
  normalizeTutorial,
  skipSteps,
  TUTORIAL_REWARD,
  TUTORIAL_STEPS,
  type TutorialSnapshot,
} from './tutorial';

const idle: TutorialSnapshot = { fightActive: false, movesMade: 0, fightsTotal: 0, itemsBought: 0, mineStarted: false };

describe('обучение', () => {
  it('новичок начинает с первого шага, подсказка видна в городе и на арене, но не в бою', () => {
    const t = newTutorial();
    expect(currentStep(t)?.id).toBe('arena');
    expect(hintFor(t, 'city')?.id).toBe('arena');
    expect(hintFor(t, 'arena')?.id).toBe('arena');
    expect(hintFor(t, 'fight')).toBeNull();
  });

  it('без изменений возвращает тот же объект', () => {
    const t = newTutorial();
    expect(advanceSteps(t, idle).tutorial).toBe(t);
  });

  it('шаги закрываются по состоянию: бой начат → зона и блок выбраны → удар', () => {
    let t = newTutorial();
    t = advanceSteps(t, { ...idle, fightActive: true }).tutorial;
    expect(currentStep(t)?.id).toBe('zone');
    expect(fightHighlight(t, false, false)).toBe('attack');
    t = advanceSteps(t, { ...idle, fightActive: true, attackChosen: true }).tutorial;
    expect(currentStep(t)?.id).toBe('block');
    expect(fightHighlight(t, true, false)).toBe('block');
    t = advanceSteps(t, { ...idle, fightActive: true, attackChosen: true, blockChosen: true }).tutorial;
    expect(currentStep(t)?.id).toBe('strike');
    expect(fightHighlight(t, true, true)).toBeNull();
    t = advanceSteps(t, { ...idle, fightActive: true, movesMade: 1 }).tutorial;
    expect(currentStep(t)?.id).toBe('shop');
  });

  it('сделанный ход закрывает сразу три боевых шага', () => {
    const t = advanceSteps(newTutorial(), { ...idle, fightActive: true, movesMade: 1 }).tutorial;
    expect(currentStep(t)?.id).toBe('shop');
  });

  it('«Понял» двигает шаг принудительно, а дальше снова смотрит на состояние', () => {
    const t = advanceSteps(newTutorial(), idle, true).tutorial;
    expect(currentStep(t)?.id).toBe('zone');
    // Бой уже был — зона, блок и удар закрываются сами.
    const t2 = advanceSteps(newTutorial(), { ...idle, fightsTotal: 1 }, true).tutorial;
    expect(currentStep(t2)?.id).toBe('shop');
  });

  it('награда выдаётся один раз, когда закрыт последний шаг', () => {
    let t = newTutorial();
    const all: TutorialSnapshot = { fightActive: false, movesMade: 0, fightsTotal: 1, itemsBought: 1, mineStarted: true, tavernVisited: true };
    const r = advanceSteps(t, all);
    expect(r.reward).toEqual(TUTORIAL_REWARD);
    expect(r.tutorial.done).toBe(true);
    expect(r.tutorial.step).toBe(TUTORIAL_STEPS.length);
    t = r.tutorial;
    expect(advanceSteps(t, all).reward).toBeNull();
    expect(advanceSteps(t, all, true).reward).toBeNull();
    expect(hintFor(t, 'city')).toBeNull();
  });

  it('пропуск закрывает обучение без награды', () => {
    const t = skipSteps(newTutorial());
    expect(t.done).toBe(true);
    expect(advanceSteps(t, idle, true).reward).toBeNull();
    expect(skipSteps(t)).toBe(t);
  });

  it('пояснение события показывается один раз', () => {
    const t = newTutorial();
    const first = firstSeen(t, 'crit');
    expect(first?.text).toContain('Крит');
    expect(firstSeen(first!.tutorial, 'crit')).toBeNull();
    expect(firstSeen(first!.tutorial, 'dodge')).not.toBeNull();
  });

  it('старый сейв с боями обучение не проходит, новый — проходит', () => {
    expect(normalizeTutorial(undefined, 5).done).toBe(true);
    expect(normalizeTutorial(undefined, 0).done).toBe(false);
    expect(normalizeTutorial({ step: 2 }, 5)).toEqual({ step: 2, done: false, seen: {} });
  });

  it('серия попаданий считается с конца лога и рвётся на блоке', () => {
    const log = [
      makeLogLine(1, 'a', 'player', 'hit'),
      makeLogLine(1, 'b', 'enemy', 'blocked'),
      makeLogLine(2, 'c', 'player', 'blocked'),
      makeLogLine(3, 'd', 'player', 'crit'),
      makeLogLine(3, 'e', 'enemy', 'hit'),
      makeLogLine(4, 'f', 'player', 'hit'),
      makeLogLine(4, 'g', 'system'),
    ];
    expect(hitStreak(log)).toBe(2);
    expect(hitStreak([])).toBe(0);
  });
});
