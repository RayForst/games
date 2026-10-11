// Базовые типы игры. Всё, что здесь, — чистые данные, без React.

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

export type Slot = 'weapon' | 'shield' | 'helmet' | 'armor' | 'gloves' | 'belt' | 'pants' | 'boots';

export const SLOTS: Slot[] = ['weapon', 'shield', 'helmet', 'armor', 'gloves', 'belt', 'pants', 'boots'];

export const SLOT_LABELS: Record<Slot, string> = {
  weapon: 'Оружие',
  shield: 'Щит',
  helmet: 'Шлем',
  armor: 'Броня',
  gloves: 'Перчатки',
  belt: 'Пояс',
  pants: 'Штаны',
  boots: 'Сапоги',
};

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
  slot: Slot;
  /** Цена в кредитах. */
  price: number;
  /** Минимальный уровень. */
  level: number;
  /** Требования к характеристикам. */
  requires?: Partial<Record<StatKey, number>>;
  /** Урон оружия [min, max]. */
  damage?: [number, number];
  bonus?: ItemBonus;
  description?: string;
}

export interface InventoryItem {
  /** Уникальный id экземпляра — у игрока может быть два одинаковых ножа. */
  uid: string;
  itemId: string;
}

export type Stats = Record<StatKey, number>;

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
}

export interface Reward {
  exp: number;
  kredits: number;
  levelsGained: number;
}

export interface LogLine {
  id: number;
  turn: number;
  text: string;
  kind: 'player' | 'enemy' | 'system';
  outcome?: StrikeOutcome;
}

export interface FightState {
  opponent: Opponent;
  playerHp: number;
  enemyHp: number;
  turn: number;
  status: FightStatus;
  log: LogLine[];
  /** История ходов игрока — ИИ соперника подстраивается. */
  playerMoves: Move[];
  lastEnemyMove: Move | null;
  reward: Reward | null;
  startedAt: number;
}
