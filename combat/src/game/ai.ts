import type { Block, Move, Zone } from './types';
import { BLOCKS, BLOCK_ZONES, ZONES } from './types';
import type { Rng } from './combat';

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Самая частая зона среди последних ходов игрока. */
function favoriteZone(moves: Move[], window: number): Zone | null {
  const recent = moves.slice(-window);
  if (recent.length === 0) return null;
  const counts = new Map<Zone, number>();
  for (const m of recent) counts.set(m.attack, (counts.get(m.attack) ?? 0) + 1);
  let best: Zone | null = null;
  let bestCount = 0;
  for (const [z, c] of counts) {
    if (c > bestCount) {
      best = z;
      bestCount = c;
    }
  }
  return best;
}

/** Блоки, закрывающие зону. */
function blocksCovering(zone: Zone): Block[] {
  return BLOCKS.filter((b) => BLOCK_ZONES[b].includes(zone));
}

/**
 * Ход бота. Чем выше уровень, тем чаще бот закрывает зону, в которую игрок бил чаще всего,
 * и тем реже бьёт в зону, которую игрок блокировал последним ходом.
 */
export function chooseEnemyMove(level: number, playerMoves: Move[], rng: Rng): Move {
  const smart = Math.min(0.75, 0.25 + level * 0.1);

  let block: Block;
  const fav = favoriteZone(playerMoves, 4);
  if (fav && rng() < smart) {
    block = pick(rng, blocksCovering(fav));
  } else {
    block = pick(rng, BLOCKS);
  }

  let attack: Zone;
  const lastBlock = playerMoves.at(-1)?.block;
  if (lastBlock && rng() < smart) {
    const open = ZONES.filter((z) => !BLOCK_ZONES[lastBlock].includes(z));
    attack = pick(rng, open);
  } else {
    attack = pick(rng, ZONES);
  }

  return { attack, block };
}
