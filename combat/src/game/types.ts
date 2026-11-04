// Базовые типы игры. Всё, что здесь, — чистые данные, без React.

import type { CapitalId, RaceId, SideId } from './races';
import type { Chests } from './chests';

export type StatKey = 'strength' | 'dexterity' | 'intuition' | 'endurance';

export const STAT_KEYS: StatKey[] = ['strength', 'dexterity', 'intuition', 'endurance'];

export const STAT_LABELS: Record<StatKey, string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  intuition: 'Интуиция',
  endurance: 'Выносливость',
};

export const STAT_HINTS: Record<StatKey, string> = {
  strength: 'Урон оружием',
  dexterity: 'Уворот и защита от крита',
  intuition: 'Крит и пробитие уворота',
  endurance: 'Здоровье',
};

/** Зоны удара — как в классическом БК: 5 зон. */
export type Zone = 'head' | 'chest' | 'belly' | 'belt' | 'legs';

export const ZONES: Zone[] = ['head', 'chest', 'belly', 'belt', 'legs'];

export const ZONE_LABELS: Record<Zone, string> = {
  head: 'Голова',
  chest: 'Корпус',
  belly: 'Живот',
  belt: 'Пояс',
  legs: 'Ноги',
};

/** Падежная форма для лога боя: «удар в голову», «удар по ногам». */
export const ZONE_TARGET: Record<Zone, string> = {
  head: 'в голову',
  chest: 'в корпус',
  belly: 'в живот',
  belt: 'в пояс',
  legs: 'по ногам',
};

/** Блок закрывает две соседние зоны — 4 варианта. */
export type Block = 'head-chest' | 'chest-belly' | 'belly-belt' | 'belt-legs';

export const BLOCKS: Block[] = ['head-chest', 'chest-belly', 'belly-belt', 'belt-legs'];

export const BLOCK_ZONES: Record<Block, [Zone, Zone]> = {
  'head-chest': ['head', 'chest'],
  'chest-belly': ['chest', 'belly'],
  'belly-belt': ['belly', 'belt'],
  'belt-legs': ['belt', 'legs'],
};

export const BLOCK_LABELS: Record<Block, string> = {
  'head-chest': 'Голова и корпус',
  'chest-belly': 'Корпус и живот',
  'belly-belt': 'Живот и пояс',
  'belt-legs': 'Пояс и ноги',
};

/** Зоны брони. Броня корпуса закрывает и корпус, и живот. */
export type ArmorZone = 'head' | 'body' | 'belt' | 'legs';

export const ARMOR_ZONES: ArmorZone[] = ['head', 'body', 'belt', 'legs'];

export const ARMOR_ZONE_LABELS: Record<ArmorZone, string> = {
  head: 'Голова',
  body: 'Корпус',
  belt: 'Пояс',
  legs: 'Ноги',
};

export const ZONE_TO_ARMOR: Record<Zone, ArmorZone> = {
  head: 'head',
  chest: 'body',
  belly: 'body',
  belt: 'belt',
  legs: 'legs',
};

export type Slot = 'weapon' | 'shield' | 'helmet' | 'armor' | 'gloves' | 'belt' | 'pants' | 'boots' | 'ring1' | 'ring2' | 'amulet';

export const SLOTS: Slot[] = ['weapon', 'shield', 'helmet', 'armor', 'gloves', 'belt', 'pants', 'boots', 'ring1', 'ring2', 'amulet'];

export const SLOT_LABELS: Record<Slot, string> = {
  weapon: 'Оружие',
  shield: 'Щит',
  helmet: 'Шлем',
  armor: 'Броня',
  gloves: 'Перчатки',
  belt: 'Пояс',
  pants: 'Штаны',
  boots: 'Сапоги',
  ring1: 'Кольцо',
  ring2: 'Кольцо',
  amulet: 'Амулет',
};

/** Кольцо в каталоге одно (`slot: 'ring'`), а слотов на руках два. */
export type ItemSlot = Exclude<Slot, 'ring1' | 'ring2'> | 'ring';

export const ITEM_SLOTS: ItemSlot[] = ['weapon', 'shield', 'helmet', 'armor', 'gloves', 'belt', 'pants', 'boots', 'ring', 'amulet'];

export const ITEM_SLOT_LABELS: Record<ItemSlot, string> = { ...SLOT_LABELS, ring: 'Кольцо' };

export const RING_SLOTS: Slot[] = ['ring1', 'ring2'];

/** В какие слоты экипировки ложится вещь каталога. */
export function slotsForItem(slot: ItemSlot): Slot[] {
  return slot === 'ring' ? RING_SLOTS : [slot];
}

/** Слот каталога для слота экипировки: `ring1`/`ring2` → `ring`. */
export function itemSlotOf(slot: Slot): ItemSlot {
  return slot === 'ring1' || slot === 'ring2' ? 'ring' : slot;
}

export interface ItemBonus {
  stats?: Partial<Record<StatKey, number>>;
  hp?: number;
  /** Мф. удара (крит), в процентах. */
  crit?: number;
  /** Мф. против удара (антикрит). */
  antiCrit?: number;
  /** Мф. уворота. */
  dodge?: number;
  /** Мф. против уворота. */
  antiDodge?: number;
  armor?: Partial<Record<ArmorZone, number>>;
}

export interface ItemDef {
  id: string;
  name: string;
  slot: ItemSlot;
  /** Цена в кредитах. */
  price: number;
  /** Минимальный уровень. */
  level: number;
  /** Требования к характеристикам. */
  requires?: Partial<Record<StatKey, number>>;
  /** Урон оружия [min, max]. */
  damage?: [number, number];
  /** Двуручное: урон выше, но вместе со щитом не носится. */
  twoHanded?: boolean;
  bonus?: ItemBonus;
  description?: string;
}

export interface InventoryItem {
  /** Уникальный id экземпляра — у игрока может быть два одинаковых ножа. */
  uid: string;
  itemId: string;
  /** Текущая прочность; 0 — сломано, бонусов не даёт. */
  durability: number;
  /** Заточка у кузнеца 0..3: оружию +урон, броне +защита. */
  upgrade: number;
}

/** Надетая вещь для расчёта характеристик. Строка — просто id (боты), объект — с заточкой и поломкой. */
export interface EquippedPiece {
  id: string;
  upgrade?: number;
  broken?: boolean;
}

export type Stats = Record<StatKey, number>;

export type InjuryKind = 'light' | 'medium' | 'heavy';

/** Травма: штраф к характеристике до момента `until`. Снимает лекарь или время. */
export interface Injury {
  kind: InjuryKind;
  stat: StatKey;
  amount: number;
  until: number;
}

export interface Character {
  name: string;
  level: number;
  exp: number;
  kredits: number;
  /** Текущее здоровье. */
  hp: number;
  /** Базовые характеристики (без бонусов предметов). */
  stats: Stats;
  freePoints: number;
  /** uid надетого предмета по слоту. */
  equipment: Record<Slot, string | null>;
  backpack: InventoryItem[];
  wins: number;
  losses: number;
  draws: number;
  createdAt: number;
  /** Когда последний раз пересчитывали hp (для регенерации). */
  hpUpdatedAt: number;
  /** Текущая травма или null. */
  injury: Injury | null;
  /** Взятые умения. */
  perks: string[];
  /** Сколько выборов умения ещё не сделано. */
  perkPicks: number;
  /** Текущее предложение из трёх умений или null. */
  perkChoices: string[] | null;
  /** Рейтинг за бои, звание считается от него. */
  rating: number;
  /** Заработанные титулы. */
  titles: string[];
  /** День последнего выхода на турнир (YYYY-MM-DD) или null. */
  lastTournamentDay: string | null;
  /** Счётчики за всю игру. */
  ledger: Ledger;
  /** Забранные достижения. */
  achievements: string[];
  /** Где персонаж сейчас на карте мира. */
  location: 'city' | 'forest' | 'swamp' | 'ruins' | 'pass' | 'brod';
  /** Ресурсы из диких земель. */
  resources: Record<'herbs' | 'wood' | 'pelts' | 'bogwort' | 'relics' | 'ore', number>;
  /** Счёт против именных соперников: id → победы/поражения игрока. */
  rivals: Record<string, { wins: number; losses: number }>;
  /** Сторона: Корона или Вольница. */
  side: SideId;
  /** Раса внутри стороны. */
  race: RaceId;
  /** Сколько раз перебегал на другую сторону (первый раз бесплатно). */
  defections: number;
  /** Родной город — столица расы (`CAPITALS`). Стартуют все в Городе, это только происхождение. */
  home: CapitalId;
  /** Нераскрытые сундуки по видам (см. `chests.ts`). */
  chests: Chests;
}

export interface Ledger {
  fightsTotal: number;
  damageDealt: number;
  damageTaken: number;
  crits: number;
  streak: number;
  bestStreak: number;
  mineEarned: number;
  kreditsEarned: number;
  kreditsSpent: number;
  itemsBought: number;
  tournamentsWon: number;
}

export interface DerivedStats {
  /** Эффективные характеристики с учётом предметов. */
  stats: Stats;
  maxHp: number;
  dmgMin: number;
  dmgMax: number;
  crit: number;
  antiCrit: number;
  dodge: number;
  antiDodge: number;
  armor: Record<ArmorZone, number>;
  /** Добавка к ставке шахты (кр./ч), от умений. */
  mineBonus: number;
  /** Множители от умений: опыт за бой, цены лекаря, скорость регенерации. */
  expMult: number;
  healMult: number;
  regenMult: number;
  /** Множитель длительности травм (расовая черта). */
  injuryMult: number;
}

/** Участник боя — всё, что нужно формулам. */
export interface Fighter {
  name: string;
  level: number;
  derived: DerivedStats;
}

export interface Move {
  attack: Zone;
  block: Block;
}

export type StrikeOutcome = 'hit' | 'crit' | 'blocked' | 'dodged' | 'crit-through-block';

export interface Strike {
  attacker: 'player' | 'enemy';
  zone: Zone;
  outcome: StrikeOutcome;
  damage: number;
  /** HP защищающегося после удара. */
  defenderHpAfter: number;
}

export type FightStatus = 'active' | 'won' | 'lost' | 'draw';

export interface Opponent {
  id: string;
  name: string;
  level: number;
  stats: Stats;
  itemIds: string[];
  derived: DerivedStats;
  /** Короткое описание для списка соперников. */
  flavor: string;
  /** Именной соперник (см. rivals.ts). */
  rivalId?: string;
  /** Сторона бота: нет у зверей из засад. Победа над чужой стороной идёт в войну сторон. */
  side?: SideId;
  race?: RaceId;
}

export interface Reward {
  exp: number;
  kredits: number;
  levelsGained: number;
  /** Изменение рейтинга. */
  rating?: number;
  /** Титул, если бой принёс его (финал турнира). */
  title?: string;
  /** Трофей — название вещи, снятой с соперника. */
  loot?: string;
}

export interface LogLine {
  id: number;
  turn: number;
  text: string;
  kind: 'player' | 'enemy' | 'system';
  outcome?: StrikeOutcome;
}

export interface FightState {
  /** Откуда бой: арена, турнир в замке, засада в лесу или гильдейская стычка. */
  context?: 'arena' | 'tournament' | 'forest' | 'guild';
  /** Чья арена: городская или Брода (там соперники сильнее, награда больше). */
  venue?: 'city' | 'brod';
  opponent: Opponent;
  playerHp: number;
  enemyHp: number;
  turn: number;
  status: FightStatus;
  log: LogLine[];
  /** История ходов игрока — ИИ соперника подстраивается. */
  playerMoves: Move[];
  lastEnemyMove: Move | null;
  /** Удары последнего раунда: [игрока, соперника] — для анимации на карточках. */
  lastStrikes?: [Strike, Strike] | null;
  reward: Reward | null;
  startedAt: number;
}
