import { ITEMS_BY_ID } from './items';
import type { ArmorZone, DerivedStats, StatKey, Stats, Zone } from './types';
import { ARMOR_ZONES, STAT_KEYS, ZONE_TO_ARMOR } from './types';

// ─── Константы баланса ──────────────────────────────────────────────────────

/** Стартовое значение каждой характеристики. */
export const BASE_STAT = 3;
/** Свободных очков при создании персонажа. */
export const CREATION_FREE_POINTS = 3;
/** Очков за уровень. */
export const POINTS_PER_LEVEL = 3;
/** Урон кулаками. */
export const UNARMED_DAMAGE: [number, number] = [1, 3];
/** Полное восстановление hp за столько минут. */
export const FULL_REGEN_MINUTES = 8;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function emptyArmor(): Record<ArmorZone, number> {
  return { head: 0, body: 0, belt: 0, legs: 0 };
}

export function baseStats(): Stats {
  return { strength: BASE_STAT, dexterity: BASE_STAT, intuition: BASE_STAT, endurance: BASE_STAT };
}

/**
 * Считает производные характеристики из базовых + списка надетых предметов.
 * Это единственное место, где живут формулы персонажа.
 */
export function deriveStats(stats: Stats, level: number, itemIds: string[]): DerivedStats {
  const eff: Stats = { ...stats };
  let hpBonus = 0;
  let crit = 0;
  let antiCrit = 0;
  let dodge = 0;
  let antiDodge = 0;
  let damage = UNARMED_DAMAGE;
  const armor = emptyArmor();

  for (const id of itemIds) {
    const item = ITEMS_BY_ID[id];
    if (!item) continue;
    if (item.damage) damage = item.damage;
    const b = item.bonus;
    if (!b) continue;
    if (b.stats) for (const k of STAT_KEYS) eff[k] += b.stats[k] ?? 0;
    hpBonus += b.hp ?? 0;
    crit += b.crit ?? 0;
    antiCrit += b.antiCrit ?? 0;
    dodge += b.dodge ?? 0;
    antiDodge += b.antiDodge ?? 0;
    if (b.armor) for (const z of ARMOR_ZONES) armor[z] += b.armor[z] ?? 0;
  }

  return {
    stats: eff,
    maxHp: 12 + eff.endurance * 6 + level * 2 + hpBonus,
    dmgMin: damage[0] + Math.floor(eff.strength / 2),
    dmgMax: damage[1] + eff.strength,
    crit: eff.intuition * 3 + crit,
    antiCrit: eff.dexterity * 2 + antiCrit,
    dodge: eff.dexterity * 3 + dodge,
    antiDodge: eff.intuition * 2 + antiDodge,
    armor,
  };
}

/** Шанс крита атакующего против защищающегося, %. */
export function critChance(attacker: DerivedStats, defender: DerivedStats): number {
  return clamp(4 + attacker.crit - defender.antiCrit, 2, 60);
}

/** Шанс уворота защищающегося от атакующего, %. */
export function dodgeChance(attacker: DerivedStats, defender: DerivedStats): number {
  return clamp(4 + defender.dodge - attacker.antiDodge, 2, 60);
}

/** Шанс пробить блок критом — половина обычного крита. */
export function critThroughBlockChance(attacker: DerivedStats, defender: DerivedStats): number {
  return critChance(attacker, defender) / 2;
}

export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Урон удара в зону с учётом брони. Крит удваивает урон и игнорирует половину брони. */
export function rollDamage(attacker: DerivedStats, defender: DerivedStats, zone: Zone, crit: boolean, rng: () => number): number {
  const base = randInt(rng, attacker.dmgMin, attacker.dmgMax);
  const armor = defender.armor[ZONE_TO_ARMOR[zone]];
  if (crit) return Math.max(1, base * 2 - Math.floor(armor / 2));
  return Math.max(1, base - armor);
}

export function statPointsTotal(level: number): number {
  return BASE_STAT * STAT_KEYS.length + CREATION_FREE_POINTS + level * POINTS_PER_LEVEL;
}

export function statLabelShort(k: StatKey): string {
  return { strength: 'Сил', dexterity: 'Лов', intuition: 'Инт', endurance: 'Вын' }[k];
}
