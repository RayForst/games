import type { Block, Fighter, FightStatus, LogLine, Move, Strike, Zone } from './types';
import { BLOCK_ZONES, ZONE_TARGET } from './types';
import { critChance, critThroughBlockChance, dodgeChance, rollDamage } from './formulas';

export type Rng = () => number;

export interface StrikeRoll {
  zone: Zone;
  outcome: Strike['outcome'];
  damage: number;
}

/**
 * Разрешает один удар: атакующий бьёт в зону, защищающийся держит блок.
 * Порядок проверок как в БК: блок → (крит сквозь блок) → уворот → крит → обычный удар.
 */
export function resolveStrike(attacker: Fighter, defender: Fighter, zone: Zone, block: Block, rng: Rng): StrikeRoll {
  const a = attacker.derived;
  const d = defender.derived;
  const blocked = BLOCK_ZONES[block].includes(zone);

  if (blocked) {
    if (rng() * 100 < critThroughBlockChance(a, d)) {
      return { zone, outcome: 'crit-through-block', damage: rollDamage(a, d, zone, true, rng) };
    }
    return { zone, outcome: 'blocked', damage: 0 };
  }

  if (rng() * 100 < dodgeChance(a, d)) {
    return { zone, outcome: 'dodged', damage: 0 };
  }
  if (rng() * 100 < critChance(a, d)) {
    return { zone, outcome: 'crit', damage: rollDamage(a, d, zone, true, rng) };
  }
  return { zone, outcome: 'hit', damage: rollDamage(a, d, zone, false, rng) };
}

export interface TurnResult {
  strikes: [Strike, Strike];
  playerHp: number;
  enemyHp: number;
  status: FightStatus;
}

/**
 * Один раунд боя. Оба бьют одновременно: удары считаются от состояния до раунда,
 * поэтому возможна ничья, когда оба падают в одном раунде.
 */
export function resolveTurn(
  player: Fighter,
  enemy: Fighter,
  playerHp: number,
  enemyHp: number,
  playerMove: Move,
  enemyMove: Move,
  rng: Rng,
): TurnResult {
  const p = resolveStrike(player, enemy, playerMove.attack, enemyMove.block, rng);
  const e = resolveStrike(enemy, player, enemyMove.attack, playerMove.block, rng);

  const nextEnemyHp = Math.max(0, enemyHp - p.damage);
  const nextPlayerHp = Math.max(0, playerHp - e.damage);

  const strikes: [Strike, Strike] = [
    { attacker: 'player', ...p, defenderHpAfter: nextEnemyHp },
    { attacker: 'enemy', ...e, defenderHpAfter: nextPlayerHp },
  ];

  let status: FightStatus = 'active';
  if (nextPlayerHp <= 0 && nextEnemyHp <= 0) status = 'draw';
  else if (nextEnemyHp <= 0) status = 'won';
  else if (nextPlayerHp <= 0) status = 'lost';

  return { strikes, playerHp: nextPlayerHp, enemyHp: nextEnemyHp, status };
}

/** Текст строки лога в стиле БК. Имена не склоняются — фразы построены так, чтобы это не требовалось. */
export function describeStrike(attackerName: string, defenderName: string, s: StrikeRoll): string {
  const target = ZONE_TARGET[s.zone];
  switch (s.outcome) {
    case 'blocked':
      return `${attackerName} пытается ударить ${target}, но ${defenderName} ставит блок.`;
    case 'dodged':
      return `${attackerName} пытается ударить ${target}, но ${defenderName} уворачивается.`;
    case 'hit':
      return `${attackerName} наносит удар ${target}: −${s.damage}`;
    case 'crit':
      return `Критический удар! ${attackerName} бьёт ${target}: −${s.damage}`;
    case 'crit-through-block':
      return `Критический удар! ${attackerName} пробивает блок и бьёт ${target}: −${s.damage}`;
  }
}

export function describeFinish(status: FightStatus, playerName: string, enemyName: string): string {
  switch (status) {
    case 'won':
      return `Бой окончен. ${playerName} побеждает!`;
    case 'lost':
      return `Бой окончен. ${enemyName} побеждает.`;
    case 'draw':
      return 'Бой окончен. Оба бойца падают — ничья.';
    default:
      return '';
  }
}

let logCounter = 0;

export function makeLogLine(turn: number, text: string, kind: LogLine['kind'], outcome?: Strike['outcome']): LogLine {
  logCounter += 1;
  return { id: Date.now() * 100 + (logCounter % 100), turn, text, kind, outcome };
}
