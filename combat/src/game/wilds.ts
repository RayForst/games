import type { DerivedStats, Opponent, StatKey } from './types';
import { generateOpponent } from './opponents';
import { deriveStats } from './formulas';

// Дикие земли: лес, болото, руины, перевал. Занятия по времени (как шахта), ресурсы, рынок, засады.

export type WildId = 'forest' | 'swamp' | 'ruins' | 'pass';

export type ResourceId = 'herbs' | 'wood' | 'pelts' | 'bogwort' | 'relics' | 'ore';

export interface ResourceDef {
  id: ResourceId;
  name: string;
  /** Базовая цена скупки за штуку. */
  basePrice: number;
  icon: ResourceId;
}

export const RESOURCES: ResourceDef[] = [
  { id: 'herbs', name: 'Травы', basePrice: 3, icon: 'herbs' },
  { id: 'wood', name: 'Дрова', basePrice: 4, icon: 'wood' },
  { id: 'pelts', name: 'Шкуры', basePrice: 7, icon: 'pelts' },
  { id: 'bogwort', name: 'Болотник', basePrice: 9, icon: 'bogwort' },
  { id: 'ore', name: 'Руда', basePrice: 6, icon: 'ore' },
  { id: 'relics', name: 'Реликвии', basePrice: 15, icon: 'relics' },
];

export const RESOURCES_BY_ID = Object.fromEntries(RESOURCES.map((r) => [r.id, r])) as Record<ResourceId, ResourceDef>;

export type Resources = Record<ResourceId, number>;

export function emptyResources(): Resources {
  return { herbs: 0, wood: 0, pelts: 0, bogwort: 0, relics: 0, ore: 0 };
}

export function normalizeResources(raw?: Partial<Resources> | null): Resources {
  return { ...emptyResources(), ...(raw ?? {}) };
}

export type ActivityId = 'herbs' | 'chop' | 'hunt' | 'bog' | 'driftwood' | 'relics' | 'dig' | 'ore' | 'snares';

export interface ActivityDef {
  id: ActivityId;
  name: string;
  /** Короткое название улова для сообщений. */
  haul: string;
  resource: ResourceId;
  stat: StatKey;
  /** Штук в час без учёта характеристики. */
  base: number;
  icon: 'herbs' | 'chop' | 'hunt' | 'bogwort' | 'wood' | 'relics' | 'dig' | 'ore' | 'snares';
  flavor: string;
}

export const ACTIVITIES: ActivityDef[] = [
  { id: 'herbs', name: 'Собирать травы', haul: 'травы', resource: 'herbs', stat: 'dexterity', base: 6, icon: 'herbs', flavor: 'Ловкие пальцы — полная сумка.' },
  { id: 'chop', name: 'Рубить дрова', haul: 'дрова', resource: 'wood', stat: 'strength', base: 5, icon: 'chop', flavor: 'Сила решает, сколько поленьев к вечеру.' },
  { id: 'hunt', name: 'Охотиться', haul: 'шкуры', resource: 'pelts', stat: 'intuition', base: 3, icon: 'hunt', flavor: 'Чутьё ведёт к зверю, а не зверя к тебе.' },
  { id: 'bog', name: 'Рвать болотник', haul: 'болотник', resource: 'bogwort', stat: 'dexterity', base: 4, icon: 'bogwort', flavor: 'Растёт по колено в жиже. Лекарь платит.' },
  { id: 'driftwood', name: 'Собирать плавник', haul: 'дрова', resource: 'wood', stat: 'strength', base: 3, icon: 'wood', flavor: 'Мокрые брёвна тяжелее сухих.' },
  { id: 'relics', name: 'Искать реликвии', haul: 'реликвии', resource: 'relics', stat: 'intuition', base: 2, icon: 'relics', flavor: 'Под каждым камнем чей-то скарб. И чьи-то кости.' },
  { id: 'dig', name: 'Разбирать завалы', haul: 'руду', resource: 'ore', stat: 'strength', base: 3, icon: 'dig', flavor: 'В старых стенах железа больше, чем в шахте.' },
  { id: 'ore', name: 'Добывать руду', haul: 'руду', resource: 'ore', stat: 'strength', base: 5, icon: 'ore', flavor: 'Кирка, ветер и жила.' },
  { id: 'snares', name: 'Ставить силки', haul: 'шкуры', resource: 'pelts', stat: 'dexterity', base: 4, icon: 'snares', flavor: 'Терпение и тонкая проволока.' },
];

export const ACTIVITIES_BY_ID = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a])) as Record<ActivityId, ActivityDef>;

export interface Foe {
  name: string;
  flavor: string;
  /** Зверь — без вещей. */
  beast: boolean;
  icon: 'wolf' | 'boar' | 'bandit' | 'drowned' | 'ghoul' | 'marauder' | 'dog' | 'hermit' | 'leopard';
}

export interface WildDef {
  id: WildId;
  activities: ActivityId[];
  foes: Foe[];
  ambushChance: number;
  /** На сколько уровней враги сильнее игрока. */
  foeLevelBonus: number;
}

export const WILDS: Record<WildId, WildDef> = {
  forest: {
    id: 'forest',
    activities: ['herbs', 'chop', 'hunt'],
    ambushChance: 0.25,
    foeLevelBonus: 0,
    foes: [
      { name: 'Волк', flavor: 'Тощий и злой. Таких тут стая.', beast: true, icon: 'wolf' },
      { name: 'Матёрый волк', flavor: 'Седой загривок, шрам через морду.', beast: true, icon: 'wolf' },
      { name: 'Кабан', flavor: 'Бьёт как таран, а бежит быстрее тебя.', beast: true, icon: 'boar' },
      { name: 'Разбойник', flavor: 'Хотел твою сумку. Теперь хочет твою голову.', beast: false, icon: 'bandit' },
      { name: 'Браконьер', flavor: 'Ты на его делянке. Он не рад.', beast: false, icon: 'bandit' },
    ],
  },
  swamp: {
    id: 'swamp',
    activities: ['bog', 'driftwood'],
    ambushChance: 0.4,
    foeLevelBonus: 1,
    foes: [
      { name: 'Утопленник', flavor: 'Вылез из жижи. Пахнет так же.', beast: true, icon: 'drowned' },
      { name: 'Болотная тварь', flavor: 'Никто не знает, кем она была.', beast: true, icon: 'ghoul' },
      { name: 'Контрабандист', flavor: 'Тропы через топь — его хлеб. Свидетели ему не нужны.', beast: false, icon: 'marauder' },
    ],
  },
  ruins: {
    id: 'ruins',
    activities: ['relics', 'dig'],
    ambushChance: 0.35,
    foeLevelBonus: 2,
    foes: [
      { name: 'Мародёр', flavor: 'Копает то же, что и ты. Делиться не собирается.', beast: false, icon: 'marauder' },
      { name: 'Одичавший пёс', flavor: 'Когда-то сторожил. Теперь охотится.', beast: true, icon: 'dog' },
      { name: 'Безумный отшельник', flavor: 'Считает руины своими. Доказывает колом.', beast: false, icon: 'hermit' },
    ],
  },
  pass: {
    id: 'pass',
    activities: ['ore', 'snares'],
    ambushChance: 0.3,
    foeLevelBonus: 1,
    foes: [
      { name: 'Горный разбойник', flavor: 'Берёт пошлину. Со всех.', beast: false, icon: 'bandit' },
      { name: 'Барс', flavor: 'Тихий. Очень тихий.', beast: true, icon: 'leopard' },
      { name: 'Дезертир', flavor: 'Ушёл с войны. Войну с собой унёс.', beast: false, icon: 'marauder' },
    ],
  },
};

export function isWild(id: string): id is WildId {
  return id in WILDS;
}

export const GATHER_MINUTES = [15, 30, 60] as const;
export type GatherMinutes = (typeof GATHER_MINUTES)[number];

export function isGatherMinutes(m: number): m is GatherMinutes {
  return (GATHER_MINUTES as readonly number[]).includes(m);
}

export interface Gathering {
  activity: ActivityId;
  startedAt: number;
  minutes: number;
}

const MINUTE_MS = 60_000;

/** Штук в час: база занятия плюс половина профильной характеристики. */
export function gatherRatePerHour(activity: ActivityId, derived: DerivedStats): number {
  const a = ACTIVITIES_BY_ID[activity];
  return a.base + Math.floor(derived.stats[a.stat] / 2);
}

export function gatherElapsedMs(g: Gathering, now: number): number {
  return Math.max(0, Math.min(now - g.startedAt, g.minutes * MINUTE_MS));
}

export function gatherDone(g: Gathering, now: number): boolean {
  return now - g.startedAt >= g.minutes * MINUTE_MS;
}

export function gatherProgress(g: Gathering, now: number): number {
  return gatherElapsedMs(g, now) / (g.minutes * MINUTE_MS);
}

export function gatherSecondsLeft(g: Gathering, now: number): number {
  return Math.max(0, Math.ceil((g.startedAt + g.minutes * MINUTE_MS - now) / 1000));
}

/** Сколько набрал к моменту `now`, целые штуки. */
export function gatherYield(g: Gathering, ratePerHour: number, now: number): number {
  return Math.floor((ratePerHour * gatherElapsedMs(g, now)) / (60 * MINUTE_MS));
}

// ─── Рынок ──────────────────────────────────────────────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Цена скупки на день: база × 0.7…1.3, одинаковая весь день. */
export function marketPrice(resource: ResourceId, day: string): number {
  const mult = 0.7 + (hash(`${day}:${resource}`) % 61) / 100;
  return Math.max(1, Math.round(RESOURCES_BY_ID[resource].basePrice * mult));
}

// ─── Засада ─────────────────────────────────────────────────────────────────

export function rollAmbush(wild: WildId, rng: () => number): boolean {
  return rng() < WILDS[wild].ambushChance;
}

/** Противник из засады: зверь без вещей, человек — как обычный бот. Уровень с надбавкой локации. */
export function wildOpponent(wild: WildId, playerLevel: number, rng: () => number): Opponent & { foeIcon: Foe['icon'] } {
  const def = WILDS[wild];
  const foe = def.foes[Math.floor(rng() * def.foes.length)];
  const level = playerLevel + def.foeLevelBonus;
  const base = generateOpponent(level, rng, new Set(), foe.beast ? 0 : 0.6);
  const itemIds = foe.beast ? [] : base.itemIds;
  return {
    ...base,
    name: foe.name,
    flavor: foe.flavor,
    itemIds,
    derived: deriveStats(base.stats, base.level, itemIds),
    foeIcon: foe.icon,
  };
}

/** Исход засады для улова: победа +25 %, поражение или ничья −50 %. */
export function haulAfterAmbush(amount: number, won: boolean): number {
  return won ? Math.ceil(amount * 1.25) : Math.floor(amount / 2);
}

// ─── Крафт ──────────────────────────────────────────────────────────────────

/** Зелья лекаря за травы: малое / среднее / большое. */
export const POTION_HERBS: Record<'small' | 'medium' | 'large', number> = { small: 3, medium: 6, large: 10 };

/** Ремонт у Макара за дрова: одно полено закрывает столько кредитов ремонта. */
export const WOOD_REPAIR_VALUE = 3;

export function woodForRepair(kredits: number): number {
  return Math.max(1, Math.ceil(kredits / WOOD_REPAIR_VALUE));
}

/** Заточка у Макара за руду: кусок руды закрывает столько кредитов заточки. */
export const ORE_UPGRADE_VALUE = 4;

export function oreForUpgrade(kredits: number): number {
  return Math.max(1, Math.ceil(kredits / ORE_UPGRADE_VALUE));
}

/** Князь скупает реликвии вдвое дороже лавки и добавляет рейтинг за каждую. */
export const RELIC_RATING = 2;

export function relicPriceAtCastle(day: string): number {
  return marketPrice('relics', day) * 2;
}

// ─── Дорожные события ──────────────────────────────────────────────────────

export interface RoadEvent {
  text: string;
  kredits?: number;
  resource?: { id: ResourceId; amount: number };
}

/** Что случилось по дороге: в трёх случаях из четырёх ничего. */
export function rollRoadEvent(level: number, rng: () => number): RoadEvent | null {
  const r = rng();
  if (r < 0.75) return null;
  if (r < 0.85) {
    const kredits = Math.round((5 + Math.floor(rng() * 10)) * (1 + level * 0.3));
    return { text: `На обочине кошель. Хозяина не видно, спрашивать некого: +${kredits} кр.`, kredits };
  }
  if (r < 0.93) {
    const ids: ResourceId[] = ['herbs', 'wood', 'pelts'];
    const id = ids[Math.floor(rng() * ids.length)];
    const amount = 2 + Math.floor(rng() * 3);
    return { text: `Попутчик-торговец расплатился за компанию: +${amount} шт., ${RESOURCES_BY_ID[id].name.toLowerCase()}.`, resource: { id, amount } };
  }
  const kredits = -(3 + Math.floor(rng() * 6));
  return { text: `У моста стража. Пошлина «за проход» ${-kredits} кр. Спорить себе дороже.`, kredits };
}
