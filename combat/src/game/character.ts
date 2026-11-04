import type { Character, DerivedStats, EquippedPiece, FightStatus, Fighter, Injury, InjuryKind, InventoryItem, ItemDef, Slot, StatKey, Stats } from './types';
import { ITEM_SLOT_LABELS, SLOTS, STAT_KEYS, STAT_LABELS, slotsForItem } from './types';
import { ITEMS_BY_ID, isTwoHanded, maxDurability } from './items';
import { CREATION_FREE_POINTS, FULL_REGEN_MINUTES, baseStats, deriveStats } from './formulas';
import { emptyLedger, normalizeLedger } from './achievements';
import { emptyResources, normalizeResources } from './wilds';
import { emptyChests, normalizeChests } from './chests';
import { emptyCosmetics, normalizeCosmetics } from './cosmetics';
import type { PerkId } from './perks';
import { DEFAULT_ORIGIN, homeOf, isValidOrigin, raceStats, switchRaceStats, type Origin, type RaceId, type SideId } from './races';
import { alignmentPriceMult } from './story';

export function emptyEquipment(): Record<Slot, string | null> {
  return Object.fromEntries(SLOTS.map((s) => [s, null])) as Record<Slot, string | null>;
}

export const STARTING_KREDITS = 50;

/**
 * Новый персонаж. `stats` — уже с расовым +1 (см. `raceStats`): так экран создания показывает то, что получится,
 * а старые тесты и боты без происхождения считают очки как раньше.
 */
export function newCharacter(name: string, stats: Stats = baseStats(), freePoints = CREATION_FREE_POINTS, now = Date.now(), origin: Origin = DEFAULT_ORIGIN): Character {
  const level = 0;
  const derived = deriveStats(stats, level, [], [], origin.race);
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
    injury: null,
    perks: [],
    perkPicks: 0,
    perkChoices: null,
    rating: 0,
    titles: [],
    lastTournamentDay: null,
    ledger: emptyLedger(),
    achievements: [],
    location: 'city',
    resources: emptyResources(),
    rivals: {},
    side: origin.side,
    race: origin.race,
    defections: 0,
    home: homeOf(origin.race),
    chests: emptyChests(),
    seals: 0,
    cosmetics: emptyCosmetics(),
    alignment: 0,
  };
}

/** Перебежчик: новая сторона и раса, расовый +1 переезжает, счётчик переходов растёт. */
export function defect(c: Character, side: SideId, race: RaceId): Character {
  if (!isValidOrigin(side, race)) return c;
  return { ...c, side, race, home: homeOf(race), stats: switchRaceStats(c.stats, c.race, race), defections: c.defections + 1 };
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

/** Надетые вещи с заточкой и поломкой — для формул. */
export function equippedPieces(c: Character): EquippedPiece[] {
  const pieces: EquippedPiece[] = [];
  for (const slot of SLOTS) {
    const uid = c.equipment[slot];
    if (!uid) continue;
    const inv = c.backpack.find((i) => i.uid === uid);
    if (inv) pieces.push({ id: inv.itemId, upgrade: inv.upgrade, broken: inv.durability <= 0 });
  }
  return pieces;
}

export function deriveCharacter(c: Character, now = Date.now()): DerivedStats {
  return deriveStats(statsWithInjury(c, now), c.level, equippedPieces(c), c.perks as PerkId[], c.race);
}

// ─── Травмы ──────────────────────────────────────────────────────────────────

export const INJURY_INFO: Record<InjuryKind, { name: string; amount: number; minutes: number; cureBase: number }> = {
  light: { name: 'Лёгкая травма', amount: 1, minutes: 20, cureBase: 4 },
  medium: { name: 'Средняя травма', amount: 2, minutes: 60, cureBase: 10 },
  heavy: { name: 'Тяжёлая травма', amount: 3, minutes: 180, cureBase: 22 },
};

/** Травма ещё действует? */
export function activeInjury(c: Character, now = Date.now()): Injury | null {
  return c.injury && c.injury.until > now ? c.injury : null;
}

/** Базовые характеристики со штрафом травмы (не ниже 1). */
export function statsWithInjury(c: Character, now = Date.now()): Stats {
  const injury = activeInjury(c, now);
  if (!injury) return c.stats;
  return { ...c.stats, [injury.stat]: Math.max(1, c.stats[injury.stat] - injury.amount) };
}

/**
 * Бросок на травму после боя: поражение 40 %, ничья 15 %, победа никогда.
 * Тяжесть: лёгкая 60 %, средняя 30 %, тяжёлая 10 %. Характеристика случайная.
 */
export function rollInjury(status: FightStatus, rng: () => number, now = Date.now(), durationMult = 1): Injury | null {
  const chance = status === 'lost' ? 0.4 : status === 'draw' ? 0.15 : 0;
  if (rng() >= chance) return null;
  const r = rng();
  const kind: InjuryKind = r < 0.6 ? 'light' : r < 0.9 ? 'medium' : 'heavy';
  const stat = STAT_KEYS[Math.floor(rng() * STAT_KEYS.length)];
  const info = INJURY_INFO[kind];
  return { kind, stat, amount: info.amount, until: now + Math.round(info.minutes * 60_000 * durationMult) };
}

/** Новая травма заменяет старую только если тяжелее. */
export function heavier(a: Injury | null, b: Injury | null): Injury | null {
  if (!a) return b;
  if (!b) return a;
  return b.amount > a.amount ? b : a;
}

/** Цена лечения травмы у лекаря: растёт с уровнем. */
export function cureCost(c: Character, injury: Injury): number {
  return Math.ceil(INJURY_INFO[injury.kind].cureBase * (1 + c.level * 0.4) * deriveCharacter(c).healMult * alignmentPriceMult(c.alignment ?? 0, 'healer'));
}

export function injuryText(injury: Injury): string {
  return `${INJURY_INFO[injury.kind].name}: −${injury.amount} ${STAT_LABELS[injury.stat].toLowerCase()}`;
}

export function injurySecondsLeft(injury: Injury, now = Date.now()): number {
  return Math.max(0, Math.ceil((injury.until - now) / 1000));
}

/** Новый экземпляр вещи: полная прочность, без заточки. */
export function newInventoryItem(uid: string, itemId: string): InventoryItem {
  const item = ITEMS_BY_ID[itemId];
  return { uid, itemId, durability: item ? maxDurability(item) : 0, upgrade: 0 };
}

/**
 * Старые сейвы без новых полей: дописываем значения по умолчанию, ничего не ломая.
 * Вызывается при загрузке; поля будущих фич тоже добавлять сюда.
 */
export function normalizeCharacter(raw: Character): Character {
  const backpack = (raw.backpack ?? []).map((i) => {
    const item = ITEMS_BY_ID[i.itemId];
    return {
      ...i,
      durability: typeof i.durability === 'number' ? i.durability : item ? maxDurability(item) : 0,
      upgrade: typeof i.upgrade === 'number' ? i.upgrade : 0,
    };
  });
  // Новые слоты (кольца, амулет) дописываем пустыми; щит рядом с двуручником из старого сейва снимаем.
  const equipment = { ...emptyEquipment(), ...(raw.equipment ?? {}) };
  const weapon = equipment.weapon ? backpack.find((i) => i.uid === equipment.weapon) : null;
  if (weapon && isTwoHanded(ITEMS_BY_ID[weapon.itemId]) && equipment.shield) equipment.shield = null;
  // Сейв до сторон: записываем в Корону Людьми и даём расовый +1, чтобы не отставать от новых.
  const hadOrigin = !!raw.race && !!raw.side && isValidOrigin(raw.side, raw.race);
  const side = hadOrigin ? raw.side : DEFAULT_ORIGIN.side;
  const race = hadOrigin ? raw.race : DEFAULT_ORIGIN.race;
  const stats = hadOrigin ? raw.stats : raceStats(raw.stats, race);
  return {
    ...raw,
    backpack,
    equipment,
    injury: raw.injury ?? null,
    perks: raw.perks ?? [],
    perkPicks: raw.perkPicks ?? 0,
    perkChoices: raw.perkChoices ?? null,
    rating: raw.rating ?? 0,
    titles: raw.titles ?? [],
    lastTournamentDay: raw.lastTournamentDay ?? null,
    ledger: normalizeLedger(raw.ledger),
    achievements: raw.achievements ?? [],
    location: raw.location ?? 'city',
    resources: normalizeResources(raw.resources),
    rivals: raw.rivals ?? {},
    stats,
    side,
    race,
    defections: typeof raw.defections === 'number' ? raw.defections : 0,
    home: raw.home ?? homeOf(race),
    chests: normalizeChests(raw.chests),
    seals: typeof raw.seals === 'number' ? raw.seals : 0,
    cosmetics: normalizeCosmetics(raw.cosmetics),
    alignment: typeof raw.alignment === 'number' ? raw.alignment : 0,
  };
}

/** Износ после боя: всё надетое теряет `amount` прочности. Возвращает персонажа и список сломавшегося. */
export function wearEquipment(c: Character, amount = 1): { character: Character; broke: ItemDef[] } {
  const equippedUids = new Set(SLOTS.map((s) => c.equipment[s]).filter((u): u is string => !!u));
  const broke: ItemDef[] = [];
  const backpack = c.backpack.map((i) => {
    if (!equippedUids.has(i.uid) || i.durability <= 0) return i;
    const durability = Math.max(0, i.durability - amount);
    if (durability === 0) {
      const item = ITEMS_BY_ID[i.itemId];
      if (item) broke.push(item);
    }
    return { ...i, durability };
  });
  return { character: { ...c, backpack }, broke };
}

/** Сколько надетых и лежащих вещей изношено (прочность ниже полной). */
export function wornItems(c: Character): InventoryItem[] {
  return c.backpack.filter((i) => {
    const item = ITEMS_BY_ID[i.itemId];
    return item ? i.durability < maxDurability(item) : false;
  });
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
  /** Пояснение при успехе: «щит снят». */
  note?: string;
}

/** Что мешает надеть вещь из-за рук: щит при двуручнике и наоборот. Возвращает слот, который надо освободить. */
export function handsConflict(c: Character, item: ItemDef): Slot | null {
  if (item.slot === 'weapon' && item.twoHanded && c.equipment.shield) return 'shield';
  if (item.slot === 'shield' && c.equipment.weapon && isTwoHanded(itemOf(c.equipment.weapon, c))) return 'weapon';
  return null;
}

/** В какой слот ляжет вещь: кольцо — в свободный из двух (если оба заняты, в первый), остальное — в свой. */
export function targetSlot(c: Character, item: ItemDef): Slot {
  const slots = slotsForItem(item.slot);
  return slots.find((s) => !c.equipment[s]) ?? slots[0];
}

/**
 * Персонаж «как будто перед надеванием»: целевой слот и конфликтующая рука освобождены.
 * Так проверка требований не учитывает вещь, которую мы заменяем, а стор знает, что снять.
 */
export function prepareEquip(c: Character, item: ItemDef): { character: Character; slot: Slot; freed: Slot[] } {
  const slot = targetSlot(c, item);
  const conflict = handsConflict(c, item);
  const freed = [slot, conflict].filter((s): s is Slot => !!s && !!c.equipment[s]);
  const equipment = { ...c.equipment };
  for (const s of freed) equipment[s] = null;
  return { character: { ...c, equipment }, slot, freed };
}

/** Можно ли надеть предмет: уровень, характеристики (с учётом уже надетого) и свободные руки. */
export function canEquip(c: Character, item: ItemDef): Check {
  if (c.level < item.level) return { ok: false, reason: `Нужен ${item.level} уровень` };
  const conflict = handsConflict(c, item);
  if (conflict === 'shield') return { ok: false, reason: 'Двуручное: сначала сними щит' };
  if (conflict === 'weapon') return { ok: false, reason: 'Сначала сними двуручное оружие' };
  const eff = deriveCharacter(c).stats;
  const lacking = STAT_KEYS.filter((k) => (item.requires?.[k] ?? 0) > eff[k]);
  if (lacking.length > 0) {
    const text = lacking.map((k) => `${STAT_LABELS[k].toLowerCase()} ${item.requires?.[k]}`).join(', ');
    return { ok: false, reason: `Нужно: ${text}` };
  }
  return { ok: true };
}

/** Подпись слота вещи для карточек: «Кольцо», «Оружие»… */
export function itemSlotLabel(item: ItemDef): string {
  return ITEM_SLOT_LABELS[item.slot];
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
  if (item.twoHanded) parts.push('двуручное, без щита');
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

/** Стоимость полного лечения у лекаря. */
export function healCost(c: Character): number {
  return 5 + c.level * 5;
}

export interface HealOption {
  id: 'small' | 'medium' | 'large';
  name: string;
  /** Доля максимального hp, которую восстанавливает. */
  fraction: number;
  /** Иконка из UI_ICONS. */
  icon: 'potion-small' | 'potion-medium' | 'potion-large';
  flavor: string;
}

/** Три зелья лекаря. Цена линейна доле hp, так что бедному новичку хватит и на малое. */
export const HEAL_OPTIONS: HealOption[] = [
  { id: 'small', name: 'Малое зелье', fraction: 0.3, icon: 'potion-small', flavor: 'Перестанет капать.' },
  { id: 'medium', name: 'Среднее зелье', fraction: 0.6, icon: 'potion-medium', flavor: 'Встанешь на ноги.' },
  { id: 'large', name: 'Большое зелье', fraction: 1, icon: 'potion-large', flavor: 'Как новенький.' },
];

/** Цена зелья: доля от полного лечения с учётом умения «Торгаш» и склонности (светлым дешевле), не меньше 1 кредита. */
export function healPrice(c: Character, fraction: number): number {
  return Math.max(1, Math.ceil(healCost(c) * Math.min(1, Math.max(0, fraction)) * deriveCharacter(c).healMult * alignmentPriceMult(c.alignment ?? 0, 'healer')));
}

/** Сколько hp даст зелье с учётом потолка. */
export function healAmount(c: Character, fraction: number): number {
  const maxHp = deriveCharacter(c).maxHp;
  return Math.min(maxHp - c.hp, Math.ceil(maxHp * Math.min(1, Math.max(0, fraction))));
}

/** Регенерация: полное восстановление за FULL_REGEN_MINUTES, считается по времени с последнего обновления. */
export function applyRegen(c: Character, now = Date.now()): Character {
  const { maxHp, regenMult } = deriveCharacter(c);
  // При полном hp метку времени обновляем не чаще раза в 30 с, чтобы не плодить лишние записи,
  // но и не накопить «мгновенную» регенерацию после снижения hp.
  if (c.hp >= maxHp) return now - c.hpUpdatedAt < 30_000 ? c : { ...c, hp: maxHp, hpUpdatedAt: now };
  const elapsed = Math.max(0, now - c.hpUpdatedAt);
  const perMs = (maxHp * regenMult) / (FULL_REGEN_MINUTES * 60 * 1000);
  const gained = Math.floor(elapsed * perMs);
  if (gained <= 0) return c;
  return { ...c, hp: Math.min(maxHp, c.hp + gained), hpUpdatedAt: now };
}

/** Через сколько секунд hp будет полным. */
export function secondsToFullHp(c: Character, now = Date.now()): number {
  const { maxHp, regenMult } = deriveCharacter(c);
  if (c.hp >= maxHp) return 0;
  const perMs = (maxHp * regenMult) / (FULL_REGEN_MINUTES * 60 * 1000);
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
