import type { FightStatus } from './types';
import type { SideId } from './races';
import { otherSide } from './races';

// Война сторон: дневной счёт между Короной и Вольницей. Очки дают бои игрока с чужой стороной
// и бои местных, которые идут сами по себе (симуляция по тику, десятки боёв в день).
// Сторона, выигравшая вчера, сегодня получает надбавку к кредитам за бои.

export interface War {
  /** День счёта (YYYY-MM-DD). */
  day: string;
  crown: number;
  free: number;
  /** Победитель вчерашнего дня — ему сегодня бонус. */
  winner: SideId | null;
  /** До какого момента досчитаны бои местных. */
  simulatedAt: number;
}

/** Очков за одну победу игрока над чужой стороной. */
export const WAR_PLAYER_POINTS = 3;
/** Рейтинга за победу над чужой стороной. */
export const WAR_RATING_BONUS = 2;
/** Множитель кредитов за бои для вчерашнего победителя. */
export const WAR_KREDITS_MULT = 1.1;
/** Бой местных раз в столько мс: 96 боёв в сутки. */
export const WAR_SIM_EVERY_MS = 15 * 60_000;
/** Сколько боёв местных досчитывать за раз (после долгого отсутствия). */
export const WAR_SIM_MAX_BATCH = 200;

export function newWar(day: string, now = Date.now(), winner: SideId | null = null): War {
  return { day, crown: 0, free: 0, winner, simulatedAt: now };
}

/** Кто ведёт (или null при равенстве). */
export function warLeader(w: Pick<War, 'crown' | 'free'>): SideId | null {
  if (w.crown === w.free) return null;
  return w.crown > w.free ? 'crown' : 'free';
}

/** Новый день: вчерашний лидер становится победителем, счёт обнуляется. Идемпотентно в пределах дня. */
export function rollWarDay(w: War | null | undefined, day: string, now = Date.now()): War {
  if (!w) return newWar(day, now);
  if (w.day === day) return w;
  return newWar(day, now, warLeader(w));
}

/** Победа стороны `side`: очки ей. */
export function addWarPoints(w: War, side: SideId, points: number): War {
  return { ...w, [side]: w[side] + points };
}

/**
 * Итог боя игрока для войны: победа над чужой стороной — очки своей, поражение от чужой — очки ей.
 * Свои против своих и ничьи войну не двигают.
 */
export function warAfterFight(w: War, mine: SideId, enemy: SideId | null | undefined, status: FightStatus): War {
  if (!enemy || enemy === mine || status === 'draw') return w;
  return status === 'won' ? addWarPoints(w, mine, WAR_PLAYER_POINTS) : addWarPoints(w, enemy, WAR_PLAYER_POINTS);
}

/** Победа над чужой стороной даёт рейтинг. */
export function warRatingBonus(mine: SideId, enemy: SideId | null | undefined, status: FightStatus): number {
  return enemy && enemy !== mine && status === 'won' ? WAR_RATING_BONUS : 0;
}

/** Бои местных, накопившиеся с прошлого тика: по одному очку случайной стороне за каждый. */
export function simulateWar(w: War, now: number, rng: () => number): War {
  const fights = Math.min(WAR_SIM_MAX_BATCH, Math.floor((now - w.simulatedAt) / WAR_SIM_EVERY_MS));
  if (fights <= 0) return w;
  let crown = w.crown;
  let free = w.free;
  for (let i = 0; i < fights; i += 1) {
    // Отстающая сторона чуть злее: держит счёт в напряжении, но не выравнивает насильно.
    const behind = crown < free ? 'crown' : free < crown ? 'free' : null;
    const pCrown = behind === 'crown' ? 0.55 : behind === 'free' ? 0.45 : 0.5;
    if (rng() < pCrown) crown += 1;
    else free += 1;
  }
  return { ...w, crown, free, simulatedAt: w.simulatedAt + fights * WAR_SIM_EVERY_MS };
}

/** Множитель кредитов за бой для стороны `side` сегодня. */
export function warKreditsMult(w: War | null | undefined, side: SideId): number {
  return w?.winner === side ? WAR_KREDITS_MULT : 1;
}

export function normalizeWar(raw: Partial<War> | null | undefined, day: string, now = Date.now()): War {
  if (!raw || typeof raw.day !== 'string') return newWar(day, now);
  return {
    day: raw.day,
    crown: typeof raw.crown === 'number' ? raw.crown : 0,
    free: typeof raw.free === 'number' ? raw.free : 0,
    winner: raw.winner === 'crown' || raw.winner === 'free' ? raw.winner : null,
    simulatedAt: typeof raw.simulatedAt === 'number' ? raw.simulatedAt : now,
  };
}

/** Строка для таблицы: «Корона ведёт 41:38». */
export function warSummary(w: War, names: Record<SideId, string>): string {
  const leader = warLeader(w);
  if (!leader) return `Ничья ${w.crown}:${w.free}`;
  return `${names[leader]} ведёт ${w[leader]}:${w[otherSide(leader)]}`;
}
