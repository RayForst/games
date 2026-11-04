import type { Character, Opponent } from './types';
import { generateOpponent, type ArchetypeName } from './opponents';

// Именные соперники: постоянные лица арены со своим характером, репликами и счётом против игрока.

export interface RivalDef {
  id: string;
  name: string;
  archetype: ArchetypeName;
  /** Уровень относительно игрока. */
  levelOffset: number;
  /** Насколько одет (0..1), см. generateOpponent. */
  gearScale: number;
  flavor: string;
  /** Реплика перед боем. */
  taunts: string[];
  /** Когда соперник выиграл. */
  gloats: string[];
  /** Когда соперник проиграл. */
  excuses: string[];
}

export const RIVALS: RivalDef[] = [
  {
    id: 'tolyan',
    name: 'Гопник Толян',
    archetype: 'воин',
    levelOffset: 0,
    gearScale: 0.3,
    flavor: 'Первый, кого бьют новички. И первый, кто бьёт их.',
    taunts: ['Э, слышь, ты чё такой дерзкий?', 'Ща без зубов домой пойдёшь.', 'Мелочь есть? А если найду?'],
    gloats: ['Толян сплёвывает: «Я ж говорил».', 'Толян забирает кредиты и обещает вернуться за остальным.'],
    excuses: ['Толян уходит, бормоча про «нечестно».', 'Толян: «Я поскользнулся. Ещё увидимся».'],
  },
  {
    id: 'bart',
    name: 'Хромой Барт',
    archetype: 'ловкач',
    levelOffset: 0,
    gearScale: 0.6,
    flavor: 'Хромает на левую. Бьёт правой.',
    taunts: ['Не смотри на ногу. Смотри на кулак.', 'Хромой догонит. Проверено.'],
    gloats: ['Барт даже не запыхался.', 'Барт: «Нога болит. А тебе как?»'],
    excuses: ['Барт хромает к выходу чуть сильнее обычного.', 'Барт: «Повезло тебе. Пока».'],
  },
  {
    id: 'nyura',
    name: 'Вдова Нюра',
    archetype: 'ловкач',
    levelOffset: 0,
    gearScale: 0.5,
    flavor: 'Похоронила троих. Все трое дрались лучше тебя.',
    taunts: ['Четвёртым будешь?', 'Не бойся, милок. Больно не будет. Долго.'],
    gloats: ['Нюра поправляет платок. Ни единой складки.', 'Нюра: «Приходи, как подрастёшь».'],
    excuses: ['Нюра: «Ну, хоть кто-то в этом городе дерётся».', 'Нюра уходит, не оглядываясь.'],
  },
  {
    id: 'butcher',
    name: 'Мясник',
    archetype: 'танк',
    levelOffset: 1,
    gearScale: 0.8,
    flavor: 'Разделывает туши. Ему всё равно, чьи.',
    taunts: ['Хрящи. Одни хрящи.', 'Стой ровно. Так быстрее.'],
    gloats: ['Мясник вытирает руки о фартук.', 'Мясник: «Жилистый. Но сойдёт».'],
    excuses: ['Мясник молча идёт точить тесак.', 'Мясник: «В следующий раз без фартука».'],
  },
  {
    id: 'shadow',
    name: 'Тень',
    archetype: 'критовик',
    levelOffset: 1,
    gearScale: 0.7,
    flavor: 'Никто не видел лица. Многие видели нож.',
    taunts: ['…', 'Ты меня не заметишь.'],
    gloats: ['Тень растворяется в толпе.', 'Тень: «Слишком медленно».'],
    excuses: ['Тень исчезает раньше, чем падает.', 'Тень: «Запомню».'],
  },
  {
    id: 'soldier',
    name: 'Старый Солдат',
    archetype: 'универсал',
    levelOffset: 1,
    gearScale: 1,
    flavor: 'Прошёл две войны. Третью ведёт здесь.',
    taunts: ['Стойка — дрянь. Исправим.', 'На войне за такое пороли.'],
    gloats: ['Солдат отдаёт честь. Без издёвки.', 'Солдат: «Урок первый. Будут ещё».'],
    excuses: ['Солдат кивает: «Годишься».', 'Солдат: «Стар я. Но ты хорош».'],
  },
];

export const RIVALS_BY_ID = Object.fromEntries(RIVALS.map((r) => [r.id, r])) as Record<string, RivalDef>;
/** Имя → id: по общему списку имён ботов приходят те же «Мясник» и «Тень», портрет у них должен быть тот же. */
export const RIVAL_ID_BY_NAME: Record<string, string> = Object.fromEntries(RIVALS.map((r) => [r.name, r.id]));

export interface RivalRecord {
  wins: number;
  losses: number;
}

export type RivalRecords = Record<string, RivalRecord>;

export function rivalRecord(c: Character, id: string): RivalRecord {
  return c.rivals[id] ?? { wins: 0, losses: 0 };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Соперник-«лицо» для арены: у новичка это всегда Толян, дальше тот, с кем давно не виделись. */
export function pickRival(c: Character, rng: () => number): RivalDef {
  if (c.wins + c.losses + c.draws === 0) return RIVALS_BY_ID.tolyan;
  const eligible = RIVALS.filter((r) => c.level + r.levelOffset >= 0);
  const fewest = Math.min(...eligible.map((r) => rivalRecord(c, r.id).wins + rivalRecord(c, r.id).losses));
  const fresh = eligible.filter((r) => rivalRecord(c, r.id).wins + rivalRecord(c, r.id).losses === fewest);
  return pick(rng, fresh);
}

/** Собрать соперника из определения: архетип, уровень и одежда — как у обычного бота, имя и характер — свои. */
export function rivalOpponent(def: RivalDef, playerLevel: number, rng: () => number): Opponent {
  const level = Math.max(0, playerLevel + def.levelOffset);
  const base = generateOpponent(level, rng, new Set(), def.gearScale, def.archetype);
  return { ...base, name: def.name, flavor: def.flavor, rivalId: def.id };
}

export function rivalTaunt(def: RivalDef, rng: () => number): string {
  return pick(rng, def.taunts);
}

export function rivalLine(def: RivalDef, playerWon: boolean, rng: () => number): string {
  return pick(rng, playerWon ? def.excuses : def.gloats);
}
