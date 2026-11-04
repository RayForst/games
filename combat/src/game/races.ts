import type { DerivedStats, StatKey, Stats } from './types';

// Стороны и расы. Две стороны, как Орда и Альянс: «Корона» (княжьи — Город, замок, стража) и
// «Вольница» (вольные — Брод, перевал, тракт). По три расы на сторону: +1 к характеристике при создании
// и одна расовая черта, которая накладывается в deriveStats после предметов и умений.
// Внешность по расе делает Portrait по полю `race` — здесь только правила.

export type SideId = 'crown' | 'free';
export type RaceId = 'human' | 'karl' | 'halfblood' | 'steppe' | 'orc' | 'bog';

/**
 * Столицы рас. Город и Брод уже на карте мира (`LocationId`); остальные — задел: ids держим здесь, а не в `world.ts`,
 * потому что `LOCATIONS_BY_ID` и дороги типизированы по `LocationId` и требуют запись на каждый id.
 * Локации построит сессия «Столицы рас, склеп и рейды».
 */
export type CapitalId = 'city' | 'brod' | 'rudnya' | 'zastava' | 'kosh' | 'kamenka' | 'topi';

export interface CapitalDef {
  id: CapitalId;
  name: string;
  /** Чем славится, 1–2 строки. */
  description: string;
  /** Уже есть на карте мира. */
  onMap: boolean;
}

export const CAPITALS: CapitalDef[] = [
  { id: 'city', name: 'Город', description: 'Столица Короны: замок князя за рекой, клуб с красными флагами, шахта, где серебро кончилось.', onMap: true },
  { id: 'brod', name: 'Брод', description: 'Столица Вольницы за перевалом: без князя и без клуба, зато арена за деньги, жирный рынок и караваны.', onMap: true },
  { id: 'rudnya', name: 'Рудня', description: 'Рудокопский посад в горах над старыми серебряными штольнями. Кузницы дымят круглые сутки, пиво варят из ячменя и злобы.', onMap: false },
  { id: 'zastava', name: 'Застава', description: 'Пограничная крепость на тракте, где полукровок больше, чем людей. Стража своя, законы князя читают по настроению.', onMap: false },
  { id: 'kosh', name: 'Кош', description: 'Степной стан за перевалом: глинобитные стены, табуны, торг конями и всем, что на конях увезли.', onMap: false },
  { id: 'kamenka', name: 'Каменка', description: 'Орочье селение в скалах: дома в пещерах, костры на уступах, за хлеб нанимаются в караванную охрану.', onMap: false },
  { id: 'topi', name: 'Топи', description: 'Свайный город на островах среди болота. Тропы знают только свои, чужие приходят с плотами и не все уходят.', onMap: false },
];

export const CAPITALS_BY_ID = Object.fromEntries(CAPITALS.map((c) => [c.id, c])) as Record<CapitalId, CapitalDef>;

export interface SideDef {
  id: SideId;
  name: string;
  /** Падежи для фраз: «+3 очка Короне», «перебежал за Вольницу». */
  dative: string;
  accusative: string;
  /** Кто это по-местному: «княжьи», «вольные». */
  folk: string;
  /** Главная столица стороны (есть на карте мира). */
  capital: CapitalId;
  description: string;
  /** Что говорят про другую сторону. */
  motto: string;
  races: RaceId[];
}

export interface RaceDef {
  id: RaceId;
  side: SideId;
  name: string;
  /** Родительный падеж: «из карлов». */
  genitive: string;
  /** Как зовут на улице. */
  nickname: string;
  /** Столица расы — родной город персонажа (`Character.home`). */
  capital: CapitalId;
  /** +1 к этой характеристике при создании. */
  stat: StatKey;
  trait: { name: string; description: string };
  description: string;
  apply: (d: DerivedStats) => void;
}

export const SIDES: SideDef[] = [
  {
    id: 'crown',
    name: 'Корона',
    dative: 'Короне',
    accusative: 'Корону',
    folk: 'княжьи',
    capital: 'city',
    description: 'Город, замок, стража. Закон князя, налог князя, турнир князя. Платят меньше, но платят всегда.',
    motto: 'Вольница — это разбой, которому дали имя.',
    races: ['human', 'karl', 'halfblood'],
  },
  {
    id: 'free',
    name: 'Вольница',
    dative: 'Вольнице',
    accusative: 'Вольницу',
    folk: 'вольные',
    capital: 'brod',
    description: 'Брод, перевал, тракт. Ни князя, ни клуба: кто сильнее, тот и прав. Платят больше, бьют крепче.',
    motto: 'Корона — это ошейник, который натёрли до блеска.',
    races: ['steppe', 'orc', 'bog'],
  },
];

export const SIDES_BY_ID = Object.fromEntries(SIDES.map((s) => [s.id, s])) as Record<SideId, SideDef>;

export const RACES: RaceDef[] = [
  {
    id: 'human',
    side: 'crown',
    name: 'Люди',
    genitive: 'людей',
    nickname: 'посадские',
    capital: 'city',
    stat: 'strength',
    trait: { name: 'Выучка', description: '+10 % опыта за бой' },
    description: 'Посадский люд: ремесленники, бывшие стражники, сыновья мельников. Ничем не выделяются, кроме того, что их больше.',
    apply: (d) => void (d.expMult *= 1.1),
  },
  {
    id: 'karl',
    side: 'crown',
    name: 'Карлы',
    genitive: 'карлов',
    nickname: 'рудокопы',
    capital: 'rudnya',
    stat: 'endurance',
    trait: { name: 'Рудная жила', description: '+4 кр. в час в шахте' },
    description: 'Низкорослые и широкие, из тех, что рубили серебро, пока оно не кончилось. Угрюмые, упрямые, долго не падают.',
    apply: (d) => void (d.mineBonus += 4),
  },
  {
    id: 'halfblood',
    side: 'crown',
    name: 'Полукровки',
    genitive: 'полукровок',
    nickname: 'подкидыши',
    capital: 'zastava',
    stat: 'dexterity',
    trait: { name: 'Дурная кровь', description: 'Здоровье восстанавливается на четверть быстрее' },
    description: 'Чья-то кровь с тракта пополам с городской. В замке их терпят, на паперти боятся. Заживают быстро — приходилось.',
    apply: (d) => void (d.regenMult *= 1.25),
  },
  {
    id: 'steppe',
    side: 'free',
    name: 'Степняки',
    genitive: 'степняков',
    nickname: 'конокрады',
    capital: 'kosh',
    stat: 'intuition',
    trait: { name: 'Степной ветер', description: '+3 % уворота' },
    description: 'Пришли из-за перевала с табунами, остались без табунов. Узкоглазые, жилистые, бьют раньше, чем ты замахнулся.',
    apply: (d) => void (d.dodge += 3),
  },
  {
    id: 'orc',
    side: 'free',
    name: 'Орки',
    genitive: 'орков',
    nickname: 'клыкастые',
    capital: 'kamenka',
    stat: 'strength',
    trait: { name: 'Толстая шкура', description: '+1 брони корпуса и пояса' },
    description: 'Горный народ с серой кожей и подпиленными зубами. Не сказки: сказки не нанимаются в караванную охрану за хлеб.',
    apply: (d) => {
      d.armor.body += 1;
      d.armor.belt += 1;
    },
  },
  {
    id: 'bog',
    side: 'free',
    name: 'Болотники',
    genitive: 'болотников',
    nickname: 'топляки',
    capital: 'topi',
    stat: 'endurance',
    trait: { name: 'Болотная кровь', description: 'Травмы проходят вдвое быстрее' },
    description: 'Бледные, молчаливые, пахнут тиной. Живут там, куда стража не ходит. Что их не убило, то уже пробовало.',
    apply: (d) => void (d.injuryMult *= 0.5),
  },
];

export const RACES_BY_ID = Object.fromEntries(RACES.map((r) => [r.id, r])) as Record<RaceId, RaceDef>;

/** Старые сейвы и боты без происхождения: Корона, Люди. */
export const DEFAULT_SIDE: SideId = 'crown';
export const DEFAULT_RACE: RaceId = 'human';

export interface Origin {
  side: SideId;
  race: RaceId;
}

export const DEFAULT_ORIGIN: Origin = { side: DEFAULT_SIDE, race: DEFAULT_RACE };

export function otherSide(side: SideId): SideId {
  return side === 'crown' ? 'free' : 'crown';
}

export function racesOf(side: SideId): RaceDef[] {
  return SIDES_BY_ID[side].races.map((id) => RACES_BY_ID[id]);
}

/** Раса принадлежит стороне? Чужую расу на сторону не берут. */
export function isValidOrigin(side: SideId, race: RaceId): boolean {
  return RACES_BY_ID[race]?.side === side;
}

/** Расовый +1 к характеристике. */
export function raceStats(stats: Stats, race: RaceId): Stats {
  const def = RACES_BY_ID[race];
  return { ...stats, [def.stat]: stats[def.stat] + 1 };
}

/** Перебежчик: расовый +1 переезжает со старой характеристики на новую (не ниже 1). */
export function switchRaceStats(stats: Stats, from: RaceId, to: RaceId): Stats {
  if (from === to) return stats;
  const a = RACES_BY_ID[from].stat;
  const b = RACES_BY_ID[to].stat;
  return { ...stats, [a]: Math.max(1, stats[a] - 1), [b]: stats[b] + (a === b ? 0 : 1) };
}

/** Расовая черта поверх производных характеристик. Без расы (старые боты) — ничего. */
export function applyRace(d: DerivedStats, race: RaceId | undefined | null): DerivedStats {
  if (race) RACES_BY_ID[race]?.apply(d);
  return d;
}

/** Родной город расы. */
export function homeOf(race: RaceId): CapitalId {
  return RACES_BY_ID[race].capital;
}

/** Случайная раса стороны — для ботов. */
export function randomRace(side: SideId, rng: () => number): RaceId {
  const list = SIDES_BY_ID[side].races;
  return list[Math.floor(rng() * list.length)];
}

export function randomSide(rng: () => number): SideId {
  return rng() < 0.5 ? 'crown' : 'free';
}

/** Подпись происхождения одной строкой: «Карлы · Корона». */
export function originText(side: SideId, race: RaceId): string {
  return `${RACES_BY_ID[race].name} · ${SIDES_BY_ID[side].name}`;
}

/** Цена перехода на другую сторону у князя. Первый раз — бесплатно. */
export const DEFECT_COST = 500;

export function defectCost(defections: number): number {
  return defections > 0 ? DEFECT_COST : 0;
}
