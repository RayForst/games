import type { FightStatus, Reward } from './types';
import { POINTS_PER_LEVEL } from './formulas';

/** Суммарный опыт, нужный для достижения уровня N (индекс массива). */
export const LEVEL_EXP = [0, 60, 200, 450, 850, 1500, 2500, 4000, 6200, 9500, 14000];

export const MAX_LEVEL = 30;

/** Опыт, необходимый для уровня `level`. За пределами таблицы — +50% за уровень. */
export function expForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level < LEVEL_EXP.length) return LEVEL_EXP[level];
  const last = LEVEL_EXP.length - 1;
  return Math.round(LEVEL_EXP[last] * Math.pow(1.5, level - last));
}

export function levelForExp(exp: number): number {
  let level = 0;
  while (level < MAX_LEVEL && exp >= expForLevel(level + 1)) level += 1;
  return level;
}

/** Прогресс до следующего уровня в [0..1]. */
export function levelProgress(level: number, exp: number): number {
  const from = expForLevel(level);
  const to = expForLevel(level + 1);
  if (to <= from) return 1;
  return Math.min(1, Math.max(0, (exp - from) / (to - from)));
}

/** Награда за бой. Победа над более сильным соперником даёт больше. */
export function rewardFor(status: FightStatus, playerLevel: number, enemyLevel: number, rng: () => number): Reward {
  const diff = enemyLevel - playerLevel;
  const mult = Math.max(0.4, 1 + diff * 0.3);
  const winExp = Math.max(4, Math.round((12 + enemyLevel * 14) * mult));
  const winKredits = Math.round((6 + enemyLevel * 7) * mult) + Math.floor(rng() * 5);

  switch (status) {
    case 'won':
      return { exp: winExp, kredits: winKredits, levelsGained: 0 };
    case 'draw':
      return { exp: Math.round(winExp / 2), kredits: Math.round(winKredits / 2), levelsGained: 0 };
    case 'lost':
      return { exp: Math.max(1, Math.round(winExp * 0.15)), kredits: 0, levelsGained: 0 };
    default:
      return { exp: 0, kredits: 0, levelsGained: 0 };
  }
}

export function pointsForLevels(levelsGained: number): number {
  return levelsGained * POINTS_PER_LEVEL;
}
