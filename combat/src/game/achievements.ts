import type { Character, Ledger } from './types';
import { SLOTS } from './types';

// Счётчики за всю игру (ledger) и достижения с наградой.

export function emptyLedger(): Ledger {
  return {
    fightsTotal: 0,
    damageDealt: 0,
    damageTaken: 0,
    crits: 0,
    streak: 0,
    bestStreak: 0,
    mineEarned: 0,
    kreditsEarned: 0,
    kreditsSpent: 0,
    itemsBought: 0,
    tournamentsWon: 0,
  };
}

export function normalizeLedger(raw?: Partial<Ledger> | null): Ledger {
  return { ...emptyLedger(), ...(raw ?? {}) };
}

/** Серия побед: победа продолжает, остальное обрывает. */
export function ledgerAfterFight(l: Ledger, won: boolean): Ledger {
  const streak = won ? l.streak + 1 : 0;
  return { ...l, fightsTotal: l.fightsTotal + 1, streak, bestStreak: Math.max(l.bestStreak, streak) };
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  reward: number;
  check: (c: Character) => boolean;
  /** Текущий прогресс для полоски: [есть, нужно]. */
  progress?: (c: Character) => [number, number];
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-blood', name: 'Первая кровь', description: 'Выиграй первый бой', reward: 10, check: (c) => c.wins >= 1, progress: (c) => [Math.min(c.wins, 1), 1] },
  { id: 'ten-wins', name: 'Десятка', description: '10 побед', reward: 30, check: (c) => c.wins >= 10, progress: (c) => [Math.min(c.wins, 10), 10] },
  { id: 'fifty-wins', name: 'Полтинник', description: '50 побед', reward: 120, check: (c) => c.wins >= 50, progress: (c) => [Math.min(c.wins, 50), 50] },
  { id: 'streak-5', name: 'Серия', description: '5 побед подряд', reward: 40, check: (c) => c.ledger.bestStreak >= 5, progress: (c) => [Math.min(c.ledger.bestStreak, 5), 5] },
  { id: 'level-5', name: 'Пятый круг', description: 'Достигни 5 уровня', reward: 60, check: (c) => c.level >= 5, progress: (c) => [Math.min(c.level, 5), 5] },
  { id: 'miner-100', name: 'Шахтёр', description: 'Заработай 100 кр. в шахте', reward: 25, check: (c) => c.ledger.mineEarned >= 100, progress: (c) => [Math.min(c.ledger.mineEarned, 100), 100] },
  {
    id: 'full-set',
    name: 'Полный комплект',
    description: 'Надень вещи во все восемь слотов',
    reward: 40,
    check: (c) => SLOTS.every((s) => !!c.equipment[s]),
    progress: (c) => [SLOTS.filter((s) => !!c.equipment[s]).length, SLOTS.length],
  },
  { id: 'sharp-3', name: 'Остриё', description: 'Заточи вещь до +3', reward: 40, check: (c) => c.backpack.some((i) => i.upgrade >= 3) },
  { id: 'champion', name: 'Чемпион', description: 'Выиграй турнир князя', reward: 100, check: (c) => c.ledger.tournamentsWon >= 1 },
  { id: 'veteran', name: 'Ветеран', description: 'Рейтинг 150', reward: 60, check: (c) => c.rating >= 150, progress: (c) => [Math.min(c.rating, 150), 150] },
  { id: 'crit-50', name: 'Критовик', description: '50 критических ударов', reward: 30, check: (c) => c.ledger.crits >= 50, progress: (c) => [Math.min(c.ledger.crits, 50), 50] },
  { id: 'survivor', name: 'Живучий', description: 'Переживи 1000 урона', reward: 30, check: (c) => c.ledger.damageTaken >= 1000, progress: (c) => [Math.min(c.ledger.damageTaken, 1000), 1000] },
  {
    id: 'old-scores',
    name: 'Старые счёты',
    description: 'Побей одного именного соперника 5 раз',
    reward: 50,
    check: (c) => Object.values(c.rivals).some((r) => r.wins >= 5),
    progress: (c) => [Math.min(Math.max(0, ...Object.values(c.rivals).map((r) => r.wins)), 5), 5],
  },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, AchievementDef>;

/** Выполненные, но ещё не забранные. */
export function claimableAchievements(c: Character): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !c.achievements.includes(a.id) && a.check(c));
}
