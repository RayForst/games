import type { DerivedStats } from './types';

// Шахта — офлайн-заработок. Персонаж уходит на смену, кредиты капают по часам,
// забрать можно в любой момент (пропорционально отработанному), драться во время смены нельзя.

export const MINE_SHIFT_HOURS = [1, 4, 8] as const;
export type ShiftHours = (typeof MINE_SHIFT_HOURS)[number];

export interface Mining {
  startedAt: number;
  hours: number;
}

const HOUR_MS = 3_600_000;

/** Кредитов в час: сила машет киркой, выносливость держит темп. */
export function mineRatePerHour(derived: DerivedStats): number {
  return 4 + derived.stats.strength + Math.floor(derived.stats.endurance / 2);
}

export function isShiftHours(h: number): h is ShiftHours {
  return (MINE_SHIFT_HOURS as readonly number[]).includes(h);
}

/** Отработанное время, не больше длины смены. */
export function mineElapsedMs(m: Mining, now: number): number {
  return Math.max(0, Math.min(now - m.startedAt, m.hours * HOUR_MS));
}

export function mineIsDone(m: Mining, now: number): boolean {
  return now - m.startedAt >= m.hours * HOUR_MS;
}

export function mineProgress(m: Mining, now: number): number {
  return mineElapsedMs(m, now) / (m.hours * HOUR_MS);
}

export function mineSecondsLeft(m: Mining, now: number): number {
  return Math.max(0, Math.ceil((m.startedAt + m.hours * HOUR_MS - now) / 1000));
}

/** Сколько заработано к моменту `now`. Целые кредиты, округление вниз. */
export function mineEarnings(m: Mining, ratePerHour: number, now: number): number {
  return Math.floor((ratePerHour * mineElapsedMs(m, now)) / HOUR_MS);
}
