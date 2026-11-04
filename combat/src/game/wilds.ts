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
  { id: 'herbs', name: 'Собирать травы', haul: 'травы', resource: 'herbs', stat: 'dexterity', base: 6, icon: 'herbs', flavor: 'Зверобой по опушкам, тысячелистник по оврагам. Ловкие пальцы — полная сумка, лекарь варит из этого зелья.' },
  { id: 'chop', name: 'Рубить дрова', haul: 'дрова', resource: 'wood', stat: 'strength', base: 5, icon: 'chop', flavor: 'Сухостой валить, сырое не брать. Сила решает, сколько поленьев к вечеру; Макар берёт их в счёт ремонта.' },
  { id: 'hunt', name: 'Охотиться', haul: 'шкуры', resource: 'pelts', stat: 'intuition', base: 3, icon: 'hunt', flavor: 'Силок, нож и терпение. Чутьё ведёт к зверю, а не зверя к тебе. Шкуры — самое дорогое, что растёт в лесу.' },
  { id: 'bog', name: 'Рвать болотник', haul: 'болотник', resource: 'bogwort', stat: 'dexterity', base: 4, icon: 'bogwort', flavor: 'Растёт по колено в жиже, тянуть надо с корнем. Лекарь платит и снимает за него травмы: три пучка — и как новый.' },
  { id: 'driftwood', name: 'Собирать плавник', haul: 'дрова', resource: 'wood', stat: 'strength', base: 3, icon: 'wood', flavor: 'Река приносит брёвна, болото их держит. Мокрые тяжелее сухих, зато ни одного живого дерева валить не надо.' },
  { id: 'relics', name: 'Искать реликвии', haul: 'реликвии', resource: 'relics', stat: 'intuition', base: 2, icon: 'relics', flavor: 'Пряжки, перстни, наконечники, обломки икон. Под каждым камнем чей-то скарб и чьи-то кости. Казначей князя платит вдвое и помнит.' },
  { id: 'dig', name: 'Разбирать завалы', haul: 'руду', resource: 'ore', stat: 'strength', base: 3, icon: 'dig', flavor: 'Скобы, решётки, кованые петли — в старых стенах железа больше, чем в шахте. Ломать не строить.' },
  { id: 'ore', name: 'Добывать руду', haul: 'руду', resource: 'ore', stat: 'strength', base: 5, icon: 'ore', flavor: 'Кирка, ветер и жила в скале. Макар засчитывает руду в заточку, а заточка — это урон.' },
  { id: 'snares', name: 'Ставить силки', haul: 'шкуры', resource: 'pelts', stat: 'dexterity', base: 4, icon: 'snares', flavor: 'Тонкая проволока на звериной тропе. Утром обойти, снять, не попасться барсу. Шкуры с перевала гуще лесных.' },
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
      { name: 'Волк', flavor: 'Тощий и злой. Таких тут стая, этот просто первый.', beast: true, icon: 'wolf' },
      { name: 'Матёрый волк', flavor: 'Седой загривок, шрам через морду. Стая ждёт, что он решит.', beast: true, icon: 'wolf' },
      { name: 'Кабан', flavor: 'Бьёт как таран, а бежит быстрее тебя. Клыки в засохшей крови — не твоей, пока.', beast: true, icon: 'boar' },
      { name: 'Разбойник', flavor: 'Хотел твою сумку. Теперь хочет твою голову, сумку заберёт потом.', beast: false, icon: 'bandit' },
      { name: 'Браконьер', flavor: 'Ты на его делянке. Он не рад, и лук у него не для белок.', beast: false, icon: 'bandit' },
      { name: 'Беглый холоп', flavor: 'Ушёл от барина с топором. Топор при нём, барин — нет.', beast: false, icon: 'marauder' },
    ],
  },
  swamp: {
    id: 'swamp',
    activities: ['bog', 'driftwood'],
    ambushChance: 0.4,
    foeLevelBonus: 1,
    foes: [
      { name: 'Утопленник', flavor: 'Вылез из жижи. Пахнет так же. Что его подняло — лучше не спрашивать.', beast: true, icon: 'drowned' },
      { name: 'Топляк', flavor: 'Лежал на дне, пока ты не наступил. Теперь недоволен.', beast: true, icon: 'drowned' },
      { name: 'Болотная тварь', flavor: 'Никто не знает, кем она была. Она, похоже, тоже.', beast: true, icon: 'ghoul' },
      { name: 'Контрабандист', flavor: 'Тропы через топь — его хлеб. Свидетели ему не нужны.', beast: false, icon: 'marauder' },
      { name: 'Сборщик пиявок', flavor: 'Банка пиявок за поясом, нож за голенищем. Болотник тут его, а не твой.', beast: false, icon: 'bandit' },
      { name: 'Болотная бабка', flavor: 'Живёт на острове среди топи. Говорят, ведьма. Говорят те, кто вернулся.', beast: false, icon: 'hermit' },
    ],
  },
  ruins: {
    id: 'ruins',
    activities: ['relics', 'dig'],
    ambushChance: 0.35,
    foeLevelBonus: 2,
    foes: [
      { name: 'Мародёр', flavor: 'Копает то же, что и ты. Делиться не собирается.', beast: false, icon: 'marauder' },
      { name: 'Гробокопатель', flavor: 'Крипту под часовней вскрыл первым. Всё, что там было, уже на нём.', beast: false, icon: 'marauder' },
      { name: 'Одичавший пёс', flavor: 'Когда-то сторожил. Теперь охотится. Ошейник до сих пор на шее.', beast: true, icon: 'dog' },
      { name: 'Упырь', flavor: 'Из тех, кого в чуму хоронили наспех. Крепость стояла на кладбище, кладбище осталось.', beast: true, icon: 'ghoul' },
      { name: 'Безумный отшельник', flavor: 'Считает руины своими. Доказывает колом.', beast: false, icon: 'hermit' },
      { name: 'Чёрный монах', flavor: 'Последний из братии, что здесь молилась. Молится и теперь. На тебя — вряд ли.', beast: false, icon: 'hermit' },
    ],
  },
  pass: {
    id: 'pass',
    activities: ['ore', 'snares'],
    ambushChance: 0.3,
    foeLevelBonus: 1,
    foes: [
      { name: 'Горный разбойник', flavor: 'Берёт пошлину. Со всех. Княжеская стража сюда не поднимается.', beast: false, icon: 'bandit' },
      { name: 'Мытарь с перевала', flavor: 'Говорит, что от князя. Грамоты нет, зато есть кистень.', beast: false, icon: 'bandit' },
      { name: 'Барс', flavor: 'Тихий. Очень тихий. Ты его увидел — значит, он разрешил.', beast: true, icon: 'leopard' },
      { name: 'Горный волк', flavor: 'Крупнее лесного и голоднее. Зимой спускается к Броду, летом ждёт тебя тут.', beast: true, icon: 'wolf' },
      { name: 'Дезертир', flavor: 'Ушёл с войны. Войну с собой унёс.', beast: false, icon: 'marauder' },
      { name: 'Беглый каторжник', flavor: 'Клеймо на лбу, обломок цепи на запястье. Цепью и бьёт.', beast: false, icon: 'marauder' },
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

/** Надбавка рынка по городу: в Броде платят больше, туда дальше везти. */
export const MARKET_MULT: Record<'city' | 'brod', number> = { city: 1, brod: 1.25 };

/** Цена скупки на день: база × 0.7…1.3 × надбавка города, одинаковая весь день. */
export function marketPrice(resource: ResourceId, day: string, town: 'city' | 'brod' = 'city'): number {
  const mult = 0.7 + (hash(`${day}:${resource}`) % 61) / 100;
  return Math.max(1, Math.round(RESOURCES_BY_ID[resource].basePrice * mult * MARKET_MULT[town]));
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

/** Лекарь снимает травму за болотник. */
export const INJURY_BOGWORT = 3;

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

type RoadEventMaker = (level: number, rng: () => number) => RoadEvent;

const money = (level: number, rng: () => number, from: number, spread: number) => Math.round((from + Math.floor(rng() * spread)) * (1 + level * 0.3));

/**
 * Таблица дорожных событий. Порядок важен: первая пятая часть — находки с кредитами, последняя — потери,
 * потому что `rollRoadEvent` берёт событие по доле от броска (тесты опираются на это).
 */
export const ROAD_EVENTS: RoadEventMaker[] = [
  // Кредиты в плюс
  (level, rng) => {
    const kredits = money(level, rng, 5, 10);
    return { text: `На обочине кошель. Хозяина не видно, спрашивать некого: +${kredits} кр.`, kredits };
  },
  (level, rng) => {
    const kredits = money(level, rng, 4, 8);
    return { text: `Купец застрял колесом в колее. Плечо подставил, монету получил: +${kredits} кр.`, kredits };
  },
  (level, rng) => {
    const kredits = money(level, rng, 6, 10);
    return { text: `У дороги лежит мертвец. Волки его уже обыскали, но не там, где нужно: +${kredits} кр.`, kredits };
  },
  (level, rng) => {
    const kredits = money(level, rng, 3, 6);
    return { text: `Мальчишка-пастух проиграл тебе в кости на привале. Отдал честно: +${kredits} кр.`, kredits };
  },
  (level, rng) => {
    const kredits = money(level, rng, 5, 8);
    return { text: `Паломники приняли тебя за охрану и заплатили за «сопровождение» до развилки: +${kredits} кр.`, kredits };
  },
  (level, rng) => {
    const kredits = money(level, rng, 8, 12);
    return { text: `Под мостом чья-то заначка в тряпице. Тряпица сгнила, заначка — нет: +${kredits} кр.`, kredits };
  },
  // Ресурсы
  (_level, rng) => {
    const ids: ResourceId[] = ['herbs', 'wood', 'pelts'];
    const id = ids[Math.floor(rng() * ids.length)];
    const amount = 2 + Math.floor(rng() * 3);
    return { text: `Попутчик-торговец расплатился за компанию: +${amount} шт., ${RESOURCES_BY_ID[id].name.toLowerCase()}.`, resource: { id, amount } };
  },
  (_level, rng) => {
    const amount = 2 + Math.floor(rng() * 3);
    return { text: `Телега дровосека перевернулась на спуске. Он матерится, ты собираешь: +${amount} шт., дрова.`, resource: { id: 'wood', amount } };
  },
  (_level, rng) => {
    const amount = 3 + Math.floor(rng() * 4);
    return { text: `Знахарка на обочине сушит травы и просит отогнать собак. Отогнал, получил: +${amount} шт., травы.`, resource: { id: 'herbs', amount } };
  },
  (_level, rng) => {
    const amount = 1 + Math.floor(rng() * 2);
    return { text: `В силках у тропы заяц. Силки не твои, заяц теперь твой: +${amount} шт., шкуры.`, resource: { id: 'pelts', amount } };
  },
  (_level, rng) => {
    const amount = 1 + Math.floor(rng() * 2);
    return { text: `Брошенный мешок у камня: кто-то бежал и не унёс. Внутри руда: +${amount} шт.`, resource: { id: 'ore', amount } };
  },
  () => ({ text: 'Из размытой дождём обочины торчит позеленевшая пряжка. Старая. Казначей такие любит: +1 шт., реликвии.', resource: { id: 'relics', amount: 1 } }),
  (_level, rng) => {
    const amount = 1 + Math.floor(rng() * 2);
    return { text: `Знахарь-попутчик показал, где у дороги растёт болотник. Нарвал по пути: +${amount} шт.`, resource: { id: 'bogwort', amount } };
  },
  // Просто истории
  () => ({ text: 'Обоз с чумными телегами. Возницы в тряпках по глаза. Ты обошёл по полю, они не заметили.' }),
  () => ({ text: 'На развилке висельник. Свежий. Табличка: «Воровал у Хозяина». Ворон смотрит на тебя, не на него.' }),
  () => ({ text: 'Стражники гонят колодников в шахту. Один подмигнул тебе: знакомое лицо с арены.' }),
  () => ({ text: 'Нищий слепец у придорожного креста назвал тебя по имени. Ты не представлялся.' }),
  () => ({ text: 'Волки шли параллельно дороге полверсты. Потом свернули. Сегодня у них другой ужин.' }),
  () => ({ text: 'Старуха с вязанкой хвороста спросила, не видел ли ты её сына. Он ушёл на войну двадцать лет назад.' }),
  () => ({ text: 'Дождь. Дорога развезлась, сапоги в грязи по щиколотку. Ничего не случилось, и слава богу.' }),
  () => ({ text: 'Столб с княжеским указом: за головы разбойников с перевала платят. Указу лет пять, разбойники целы.' }),
  () => ({ text: 'На привале у костра сидели двое в плащах. Говорили о Тени. Замолчали, когда ты подошёл.' }),
  () => ({ text: 'Монах на дороге благословил тебя и попросил кредит. Ты дал благословение в ответ.' }),
  // Кредиты в минус
  (_level, rng) => {
    const kredits = -(3 + Math.floor(rng() * 6));
    return { text: `У моста стража. Пошлина «за проход» ${-kredits} кр. Спорить себе дороже.`, kredits };
  },
  (_level, rng) => {
    const kredits = -(2 + Math.floor(rng() * 5));
    return { text: `На постоялом дворе ночью кто-то шарил по карманам. Нащупал ${-kredits} кр. Ты спал, как убитый.`, kredits };
  },
  (_level, rng) => {
    const kredits = -(3 + Math.floor(rng() * 5));
    return { text: `Сапог лопнул на камнях. Сапожник в придорожной хибаре взял ${-kredits} кр. и не торопился.`, kredits };
  },
  (_level, rng) => {
    const kredits = -(4 + Math.floor(rng() * 6));
    return { text: `Мытарь князя с грамотой и двумя копейщиками. Дорожный сбор ${-kredits} кр. Грамоту ты не читал.`, kredits };
  },
];

/** Что случилось по дороге: в трёх случаях из четырёх ничего, иначе событие из таблицы по доле броска. */
export function rollRoadEvent(level: number, rng: () => number): RoadEvent | null {
  const r = rng();
  if (r < 0.75) return null;
  const idx = Math.min(ROAD_EVENTS.length - 1, Math.floor(((r - 0.75) / 0.25) * ROAD_EVENTS.length));
  return ROAD_EVENTS[idx](level, rng);
}
