import type { LogLine } from './types';

/**
 * Обучение новичка: семь шагов, каждый закрывается сам, когда игрок сделал нужное,
 * либо кнопкой «Понял». За прохождение — награда, один раз. Чистая логика без React.
 */

export type TutorialStepId = 'arena' | 'zone' | 'block' | 'strike' | 'shop' | 'mine' | 'tavern';

/** На каких экранах показывать подсказку шага. */
export type TutorialScreen = 'city' | 'arena' | 'fight' | 'shop' | 'mine' | 'tavern';

export interface TutorialStep {
  id: TutorialStepId;
  title: string;
  /** Текст в тоне Старого Солдата: коротко, без сюсюканья. */
  text: string;
  screens: TutorialScreen[];
}

/** Что из состояния стора нужно, чтобы понять, сделан ли шаг. */
export interface TutorialSnapshot {
  /** Идёт бой (или уже был начат). */
  fightActive: boolean;
  /** Сколько ходов сделано в текущем бою. */
  movesMade: number;
  fightsTotal: number;
  itemsBought: number;
  /** Смена в шахте или караване поставлена либо уже оплачена. */
  mineStarted: boolean;
  /** Остальное стор не знает: выбор зоны и блока живёт на экране боя, визит в пивную — на её экране. */
  attackChosen?: boolean;
  blockChosen?: boolean;
  tavernVisited?: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'arena',
    title: 'Первый бой',
    text: 'Толян ждёт на арене. Иди и покажи, что ты не мешок с костями: арена — на карте, второй тап — вход.',
    screens: ['city', 'arena'],
  },
  {
    id: 'zone',
    title: 'Выбери, куда бить',
    text: 'Левый столбец — удар. В голову бьют больнее, но её чаще закрывают. Ноги почти не берегут.',
    screens: ['fight'],
  },
  {
    id: 'block',
    title: 'Закройся блоком',
    text: 'Стойка — дрянь. Исправим: правый столбец — блок, каждый держит две зоны сразу. Угадай, куда он бьёт.',
    screens: ['fight'],
  },
  {
    id: 'strike',
    title: 'Удар!',
    text: 'Жми красную кнопку. Бьют оба разом, кто упал — тот и проиграл. Смотри, куда он бил, и закрывайся.',
    screens: ['fight'],
  },
  {
    id: 'shop',
    title: 'После боя — магазин',
    text: 'На первые кредиты бери оружие. Голыми руками долго не навоюешь, а броня подождёт.',
    screens: ['city', 'arena', 'shop'],
  },
  {
    id: 'mine',
    title: 'Шахта платит, пока тебя нет',
    text: 'Поставь смену и уходи. Кредиты накапают сами, только драться во время смены нельзя.',
    screens: ['city', 'mine'],
  },
  {
    id: 'tavern',
    title: 'Пивная: задания на день',
    text: 'Там дают три задания на день и платят за каждое. Слухи у стойки тоже не зря болтают.',
    screens: ['city', 'tavern'],
  },
];

/** Пояснения событий боя при первом появлении. */
export type SeenEvent = 'crit' | 'dodge' | 'broke' | 'injury';

export const SEEN_TEXTS: Record<SeenEvent, string> = {
  crit: 'Крит: удар вдвое злее, броня не спасает. Интуиция даёт криты, она же их и ловит.',
  dodge: 'Уворот: удар ушёл в пустоту. Ловкость уводит от удара, интуиция бьющего её ловит.',
  broke: 'Вещь сломалась: без прочности она не работает. Кузница чинит за кредиты или дрова.',
  injury: 'Травма режет характеристики, пока не пройдёт. Лекарь снимает за кредиты, Болотник тоже.',
};

export interface Tutorial {
  /** Индекс текущего шага в `TUTORIAL_STEPS`. */
  step: number;
  done: boolean;
  /** Какие события боя уже объяснены. */
  seen: Partial<Record<SeenEvent, true>>;
}

export const TUTORIAL_REWARD = { kredits: 50, herbs: 3 } as const;

export function newTutorial(): Tutorial {
  return { step: 0, done: false, seen: {} };
}

/** Старые сейвы: кто уже дрался, обучение не проходит. */
export function normalizeTutorial(t: Partial<Tutorial> | undefined, fightsTotal: number): Tutorial {
  if (!t) return fightsTotal > 0 ? { step: TUTORIAL_STEPS.length, done: true, seen: { crit: true, dodge: true, broke: true, injury: true } } : newTutorial();
  return { step: t.step ?? 0, done: t.done ?? false, seen: t.seen ?? {} };
}

export function currentStep(t: Tutorial): TutorialStep | null {
  if (t.done) return null;
  return TUTORIAL_STEPS[t.step] ?? null;
}

/** Сделан ли шаг по состоянию игры. */
export function stepDone(step: TutorialStep, s: TutorialSnapshot): boolean {
  switch (step.id) {
    case 'arena':
      return s.fightActive || s.fightsTotal > 0;
    case 'zone':
      return !!s.attackChosen || s.movesMade > 0 || s.fightsTotal > 0;
    case 'block':
      return !!s.blockChosen || s.movesMade > 0 || s.fightsTotal > 0;
    case 'strike':
      return s.movesMade > 0 || s.fightsTotal > 0;
    case 'shop':
      return s.itemsBought > 0;
    case 'mine':
      return s.mineStarted;
    case 'tavern':
      return !!s.tavernVisited;
  }
}

export interface TutorialAdvance {
  tutorial: Tutorial;
  /** Награда выдаётся один раз — когда закрылся последний шаг. */
  reward: typeof TUTORIAL_REWARD | null;
}

/**
 * Продвинуть обучение: закрыть все подряд сделанные шаги (или один принудительно — кнопка «Понял»).
 * Возвращает тот же объект, если ничего не изменилось.
 */
export function advanceSteps(t: Tutorial, s: TutorialSnapshot, force = false): TutorialAdvance {
  if (t.done) return { tutorial: t, reward: null };
  let step = t.step;
  if (force) step += 1;
  while (step < TUTORIAL_STEPS.length && stepDone(TUTORIAL_STEPS[step], s)) step += 1;
  if (step === t.step) return { tutorial: t, reward: null };
  if (step >= TUTORIAL_STEPS.length) return { tutorial: { ...t, step: TUTORIAL_STEPS.length, done: true }, reward: TUTORIAL_REWARD };
  return { tutorial: { ...t, step }, reward: null };
}

/** «Пропустить обучение»: без награды. */
export function skipSteps(t: Tutorial): Tutorial {
  return t.done ? t : { ...t, step: TUTORIAL_STEPS.length, done: true };
}

/** Подсказка для экрана: текущий шаг, если он здесь уместен. */
export function hintFor(t: Tutorial, screen: TutorialScreen): TutorialStep | null {
  const step = currentStep(t);
  return step && step.screens.includes(screen) ? step : null;
}

/** Что подсветить на экране боя: столбец удара, блока или ничего. */
export function fightHighlight(t: Tutorial, attackChosen: boolean, blockChosen: boolean): 'attack' | 'block' | null {
  const step = currentStep(t);
  if (!step) return null;
  if (step.id === 'zone' && !attackChosen) return 'attack';
  if ((step.id === 'zone' || step.id === 'block') && !blockChosen) return 'block';
  return null;
}

/** Первое появление события: вернуть пояснение и отметить, что оно показано. Второй раз — null. */
export function firstSeen(t: Tutorial, event: SeenEvent): { tutorial: Tutorial; text: string } | null {
  if (t.seen[event]) return null;
  return { tutorial: { ...t, seen: { ...t.seen, [event]: true } }, text: SEEN_TEXTS[event] };
}

/** Серия попаданий игрока подряд (с конца лога), для счётчика на экране боя. */
export function hitStreak(log: LogLine[]): number {
  let n = 0;
  for (let i = log.length - 1; i >= 0; i--) {
    const l = log[i];
    if (l.kind !== 'player') continue;
    if (l.outcome === 'hit' || l.outcome === 'crit' || l.outcome === 'crit-through-block') n += 1;
    else break;
  }
  return n;
}
