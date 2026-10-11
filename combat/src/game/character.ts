import type { Character, DerivedStats, Fighter, ItemDef, Slot, StatKey, Stats } from './types';
import { SLOTS, STAT_KEYS, STAT_LABELS } from './types';
import { ITEMS_BY_ID } from './items';
import { CREATION_FREE_POINTS, FULL_REGEN_MINUTES, baseStats, deriveStats } from './formulas';

export function emptyEquipment(): Record<Slot, string | null> {
  return Object.fromEntries(SLOTS.map((s) => [s, null])) as Record<Slot, string | null>;
}

export const STARTING_KREDITS = 50;

export function newCharacter(name: string, stats: Stats = baseStats(), freePoints = CREATION_FREE_POINTS, now = Date.now()): Character {
  const level = 0;
  const derived = deriveStats(stats, level, []);
  return {
    name: name.trim(),
    level,
    exp: 0,
    kredits: STARTING_KREDITS,
    hp: derived.maxHp,
    stats,
    freePoints,
    equipment: emptyEquipment(),
    backpack: [],
    wins: 0,
    losses: 0,
    draws: 0,
    createdAt: now,
    hpUpdatedAt: now,
  };
}

/** Id предметов (каталожные), которые сейчас надеты. */
export function equippedItemIds(c: Character): string[] {
  const ids: string[] = [];
  for (const slot of SLOTS) {
    const uid = c.equipment[slot];
    if (!uid) continue;
    const inv = c.backpack.find((i) => i.uid === uid);
    if (inv) ids.push(inv.itemId);
  }
  return ids;
}

export function deriveCharacter(c: Character): DerivedStats {
  return deriveStats(c.stats, c.level, equippedItemIds(c));
}

export function toFighter(c: Character): Fighter {
  return { name: c.name, level: c.level, derived: deriveCharacter(c) };
}

export function isEquipped(c: Character, uid: string): boolean {
  return SLOTS.some((s) => c.equipment[s] === uid);
}

export interface Check {
  ok: boolean;
  reason?: string;
}

/** Можно ли надеть предмет: уровень и характеристики (с учётом уже надетого). */
export function canEquip(c: Character, item: ItemDef): Check {
  if (c.level < item.level) return { ok: false, reason: `Нужен ${item.level} уровень` };
  const eff = deriveCharacter(c).stats;
  const lacking = STAT_KEYS.filter((k) => (item.requires?.[k] ?? 0) > eff[k]);
  if (lacking.length > 0) {
    const text = lacking.map((k) => `${STAT_LABELS[k].toLowerCase()} ${item.requires?.[k]}`).join(', ');
    return { ok: false, reason: `Нужно: ${text}` };
  }
  return { ok: true };
}

/** Требования предмета одной строкой — для карточек. */
export function requirementsText(item: ItemDef): string {
  const parts: string[] = [];
  if (item.level > 0) parts.push(`${item.level} ур.`);
  for (const k of STAT_KEYS) {
    const v = item.requires?.[k];
    if (v) parts.push(`${STAT_LABELS[k].toLowerCase()} ${v}`);
  }
  return parts.join(', ');
}

/** Бонусы предмета одной строкой. */
export function bonusText(item: ItemDef): string {
  const parts: string[] = [];
  if (item.damage) parts.push(`урон ${item.damage[0]}–${item.damage[1]}`);
  const b = item.bonus;
  if (b) {
    if (b.armor) {
      const a = b.armor;
      const z = [a.head && `голова ${a.head}`, a.body && `корпус ${a.body}`, a.belt && `пояс ${a.belt}`, a.legs && `ноги ${a.legs}`].filter(Boolean);
      if (z.length) parts.push(`броня: ${z.join(', ')}`);
    }
    if (b.stats) for (const k of STAT_KEYS) if (b.stats[k]) parts.push(`${STAT_LABELS[k].toLowerCase()} ${fmt(b.stats[k]!)}`);
    if (b.hp) parts.push(`hp ${fmt(b.hp)}`);
    if (b.crit) parts.push(`крит ${fmt(b.crit)}%`);
    if (b.antiCrit) parts.push(`антикрит ${fmt(b.antiCrit)}%`);
    if (b.dodge) parts.push(`уворот ${fmt(b.dodge)}%`);
    if (b.antiDodge) parts.push(`антиуворот ${fmt(b.antiDodge)}%`);
  }
  return parts.join(' · ');
}

function fmt(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

/** Стоимость лечения у лекаря. */
export function healCost(c: Character): number {
  return 5 + c.level * 5;
}

/** Регенерация: полное восстановление за FULL_REGEN_MINUTES, считается по времени с последнего обновления. */
export function applyRegen(c: Character, now = Date.now()): Character {
  const maxHp = deriveCharacter(c).maxHp;
  // При полном hp метку времени обновляем не чаще раза в 30 с, чтобы не плодить лишние записи,
  // но и не накопить «мгновенную» регенерацию после снижения hp.
  if (c.hp >= maxHp) return now - c.hpUpdatedAt < 30_000 ? c : { ...c, hp: maxHp, hpUpdatedAt: now };
  const elapsed = Math.max(0, now - c.hpUpdatedAt);
  const perMs = maxHp / (FULL_REGEN_MINUTES * 60 * 1000);
  const gained = Math.floor(elapsed * perMs);
  if (gained <= 0) return c;
  return { ...c, hp: Math.min(maxHp, c.hp + gained), hpUpdatedAt: now };
}

/** Через сколько секунд hp будет полным. */
export function secondsToFullHp(c: Character, now = Date.now()): number {
  const maxHp = deriveCharacter(c).maxHp;
  if (c.hp >= maxHp) return 0;
  const perMs = maxHp / (FULL_REGEN_MINUTES * 60 * 1000);
  const elapsed = Math.max(0, now - c.hpUpdatedAt);
  const remainingMs = (maxHp - c.hp) / perMs - elapsed;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function statOrder(): StatKey[] {
  return [...STAT_KEYS];
}

export function itemOf(uid: string, c: Character): ItemDef | null {
  const inv = c.backpack.find((i) => i.uid === uid);
  return inv ? (ITEMS_BY_ID[inv.itemId] ?? null) : null;
}
