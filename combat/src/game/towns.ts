import type { JobId } from './mine';
import type { RaceId, SideId } from './races';
import { SIDES_BY_ID } from './races';
import { isTown, LOCATIONS_BY_ID, type LocationId, type TownId } from './world';

// Города и столицы рас: что в каждом есть и чем он особенный. Один хаб `TownHub` рисует любой город по этим данным;
// Город остаётся картинкой-хабом, но его правила (арена, рынок, шахта) тоже здесь.

/** Особенность города: одно правило, которое применяется в сторе и показывается в хабе. */
export interface TownPerk {
  name: string;
  description: string;
  /** Множитель цен кузницы (ремонт и заточка). */
  smithyMult?: number;
  /** Множитель цен лекаря (зелья и травмы за кредиты). */
  healerMult?: number;
  /** Множитель ставки работы в этом городе. */
  jobMult?: number;
  /** Сколько болотника лекарь берёт за травму (обычно `INJURY_BOGWORT`). */
  injuryBogwort?: number;
}

export interface TownDef {
  id: TownId;
  name: string;
  /** Предложный падеж: «в Рудне». */
  locative: string;
  side: SideId;
  /** Чья это столица; null — главная столица стороны, там живут все её расы. */
  race: RaceId | null;
  /** Арена: соперники на столько уровней выше и во сколько раз больше награда. */
  arenaLevelBonus: number;
  arenaMult: number;
  arenaName: string;
  arenaHint: string;
  /** Именные соперники в зале — только в Городе, где клуб. */
  rivals: boolean;
  /** Работа по времени и как она тут называется. */
  job: JobId;
  jobName: string;
  jobHint: string;
  perk: TownPerk;
}

export const TOWNS: TownDef[] = [
  {
    id: 'city',
    name: 'Город',
    locative: 'в Городе',
    side: 'crown',
    race: null,
    arenaLevelBonus: 0,
    arenaMult: 1,
    arenaName: 'Арена',
    arenaHint: 'Выбери соперника. Бой — до первого упавшего.',
    rivals: true,
    job: 'mine',
    jobName: 'Шахта',
    jobHint: 'Серебро кончилось, кредиты — нет. Смена по часам, забрать можно раньше.',
    perk: { name: 'Княжий двор', description: 'Замок с турниром, пивная с доской заданий и клуб со знакомыми лицами — только здесь.' },
  },
  {
    id: 'brod',
    name: 'Брод',
    locative: 'в Броде',
    side: 'free',
    race: null,
    arenaLevelBonus: 1,
    arenaMult: 1.2,
    arenaName: 'Арена Брода',
    arenaHint: 'Здесь дерутся не за уважение, а за деньги: соперники на уровень выше, плата и опыт на пятую часть больше.',
    rivals: false,
    job: 'caravan',
    jobName: 'Караван',
    jobHint: 'Охрана обоза через перевал. Платят больше шахты, но тракт любят разбойники.',
    perk: { name: 'Вольный торг', description: 'Рынок платит за ресурсы на четверть больше, арена — на пятую часть.' },
  },
  {
    id: 'rudnya',
    name: 'Рудня',
    locative: 'в Рудне',
    side: 'crown',
    race: 'karl',
    arenaLevelBonus: 0,
    arenaMult: 1,
    arenaName: 'Круг у штольни',
    arenaHint: 'Карлы дерутся низко и упрямо. Плата как в Городе, знакомых нет.',
    rivals: false,
    job: 'mine',
    jobName: 'Штольня',
    jobHint: 'Шахта карлов: глубже городской, ставка та же, зато кузница рядом.',
    perk: { name: 'Рудная кузня', description: 'Ремонт и заточка на 20 % дешевле: железа тут больше, чем работы.', smithyMult: 0.8 },
  },
  {
    id: 'zastava',
    name: 'Застава',
    locative: 'на Заставе',
    side: 'crown',
    race: 'halfblood',
    arenaLevelBonus: 0,
    arenaMult: 1,
    arenaName: 'Двор заставы',
    arenaHint: 'Стража смотрит, но не лезет. Бьются до первого упавшего, как везде.',
    rivals: false,
    job: 'caravan',
    jobName: 'Обоз',
    jobHint: 'Обозы через ворота заставы нанимают охрану. Тракт тот же, разбойники те же.',
    perk: { name: 'Гарнизонный лекарь', description: 'Зелья и лечение травм на четверть дешевле: привык штопать своих.', healerMult: 0.75 },
  },
  {
    id: 'kamenka',
    name: 'Каменка',
    locative: 'в Каменке',
    side: 'free',
    race: 'orc',
    arenaLevelBonus: 0,
    arenaMult: 1,
    arenaName: 'Площадка над обрывом',
    arenaHint: 'Орки бьют крепко и падать не любят. Плата обычная.',
    rivals: false,
    job: 'mine',
    jobName: 'Каменоломня',
    jobHint: 'Ломать скалу за кредиты. Как шахта, только выше и холоднее.',
    perk: { name: 'Голодные скалы', description: 'Своего хлеба нет: рынок платит за ресурсы на 15 % больше.' },
  },
  {
    id: 'kosh',
    name: 'Кош',
    locative: 'в Коше',
    side: 'free',
    race: 'steppe',
    arenaLevelBonus: 0,
    arenaMult: 1,
    arenaName: 'Круг из телег',
    arenaHint: 'Степняки бьют раньше, чем ты замахнулся. Плата обычная.',
    rivals: false,
    job: 'caravan',
    jobName: 'Караван',
    jobHint: 'Караваны на степных конях: оборачиваются быстрее, платят за час больше.',
    perk: { name: 'Степные кони', description: 'Караван платит за час на 20 % больше: лошади степняков не знают усталости.', jobMult: 1.2 },
  },
  {
    id: 'topi',
    name: 'Топи',
    locative: 'в Топях',
    side: 'free',
    race: 'bog',
    arenaLevelBonus: 0,
    arenaMult: 1,
    arenaName: 'Помост на сваях',
    arenaHint: 'Упал в воду — проиграл. Болотники не падают.',
    rivals: false,
    job: 'caravan',
    jobName: 'Плоты',
    jobHint: 'Проводить плоты через топь. Платят как за караван, грабят так же.',
    perk: { name: 'Болотный знахарь', description: 'Травму снимает за 2 болотника вместо 3: трава растёт под крыльцом.', injuryBogwort: 2 },
  },
];

export const TOWNS_BY_ID = Object.fromEntries(TOWNS.map((t) => [t.id, t])) as Record<TownId, TownDef>;

/** Город по локации или null, если персонаж в диких землях или в склепе. */
export function townOf(location: LocationId | string): TownDef | null {
  return isTown(location) ? TOWNS_BY_ID[location] : null;
}

export function townsOfSide(side: SideId): TownDef[] {
  return TOWNS.filter((t) => t.side === side);
}

/** Главная столица стороны. */
export function capitalOf(side: SideId): TownDef {
  return TOWNS_BY_ID[SIDES_BY_ID[side].capital];
}

export function townSmithyMult(location: string): number {
  return townOf(location)?.perk.smithyMult ?? 1;
}

export function townHealerMult(location: string): number {
  return townOf(location)?.perk.healerMult ?? 1;
}

export function townJobMult(location: string): number {
  return townOf(location)?.perk.jobMult ?? 1;
}

/** Цена с учётом особенности города, не меньше 1 кр. (если было за что платить). */
export function townPrice(base: number, mult: number): number {
  return base <= 0 ? 0 : Math.max(1, Math.round(base * mult));
}

/** Описание локации для шапки хаба. */
export function townDescription(id: TownId): string {
  return LOCATIONS_BY_ID[id].description;
}
