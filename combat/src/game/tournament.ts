import type { Character, FightStatus, Opponent } from './types';
import { generateOpponent } from './opponents';
import { dayKey } from './quests';
import { deriveCharacter } from './character';

// Замок: турнир князя раз в день — четыре боя подряд, hp между боями не восстанавливается.
// Рейтинг: очки за все бои, звание по рейтингу.

export const TOURNAMENT_ROUNDS = 4;

export interface Tournament {
  day: string;
  /** Сколько боёв уже выиграно (0..4). */
  stage: number;
  opponents: Opponent[];
  status: 'active' | 'won' | 'lost';
}

/** Уровни соперников: два равных, потом +1 и +2. */
export function tournamentLevels(playerLevel: number): number[] {
  return [playerLevel, playerLevel, playerLevel + 1, playerLevel + 2];
}

export function createTournament(playerLevel: number, rng: () => number, now = Date.now()): Tournament {
  const used = new Set<string>();
  const opponents = tournamentLevels(playerLevel).map((l) => generateOpponent(l, rng, used, 1));
  return { day: dayKey(now), stage: 0, opponents, status: 'active' };
}

export function tournamentPrize(playerLevel: number): { kredits: number; exp: number; title: string } {
  return {
    kredits: 60 + playerLevel * 40,
    exp: 40 + playerLevel * 30,
    title: `Чемпион турнира ${playerLevel + 1}-го круга`,
  };
}

export interface EnterCheck {
  ok: boolean;
  reason?: string;
}

/** Можно ли выйти на турнир: раз в день и не ниже половины здоровья. */
export function canEnterTournament(c: Character, mining: boolean, now = Date.now()): EnterCheck {
  if (mining) return { ok: false, reason: 'Ты в шахте' };
  if (c.lastTournamentDay === dayKey(now)) return { ok: false, reason: 'Сегодня ты уже выходил. Приходи завтра.' };
  const { maxHp } = deriveCharacter(c, now);
  if (c.hp < maxHp / 2) return { ok: false, reason: 'С таким здоровьем на турнир не пускают. Нужна хотя бы половина.' };
  return { ok: true };
}

// ─── Рейтинг и звания ──────────────────────────────────────────────────────

export const RANKS: { min: number; name: string }[] = [
  { min: 0, name: 'Новичок' },
  { min: 50, name: 'Боец' },
  { min: 150, name: 'Ветеран' },
  { min: 400, name: 'Мастер' },
  { min: 800, name: 'Чемпион' },
];

export function rankFor(rating: number): string {
  let name = RANKS[0].name;
  for (const r of RANKS) if (rating >= r.min) name = r.name;
  return name;
}

/** Следующее звание и сколько до него осталось, или null на вершине. */
export function nextRank(rating: number): { name: string; left: number } | null {
  const next = RANKS.find((r) => r.min > rating);
  return next ? { name: next.name, left: next.min - rating } : null;
}

/** Очки за бой: победа +8 (+4 за каждый уровень соперника сверх твоего), ничья +1, поражение −4. Ниже нуля не падает. */
export function ratingDelta(status: FightStatus, playerLevel: number, enemyLevel: number, tournament = false): number {
  const diff = Math.max(0, enemyLevel - playerLevel);
  const mult = tournament ? 2 : 1;
  if (status === 'won') return (8 + diff * 4) * mult;
  if (status === 'draw') return 1;
  if (status === 'lost') return -4;
  return 0;
}
