import type { Opponent, Slot, StatKey, Stats } from './types';
import { itemSlotOf, SLOTS, STAT_KEYS } from './types';
import { ITEMS } from './items';
import { baseStats, deriveStats, statPointsTotal } from './formulas';
import type { Rng } from './combat';
import { randomRace, randomSide, type RaceId, type SideId } from './races';

/**
 * Клички массовки. Именные лица арены (Толян, Барт, Нюра, Мясник, Тень, Солдат) живут в rivals.ts
 * и сюда не входят, чтобы не раздваиваться.
 */
export const NAMES = [
  // Дворовые
  'Крыса Вася', 'Бомж с Паперти', 'Колян Задира', 'Сеня Кулак', 'Дядя Жора', 'Берсерк Бодя',
  'Кривой Гоша', 'Шнырь', 'Пашка Шило', 'Витёк Полторы Ноги', 'Лёха Пятак', 'Санёк Беззубый',
  'Жека Кабан', 'Стёпа Оглобля', 'Митяй Соплежуй', 'Гриня Два Ножа', 'Федька Обрез', 'Тоха Чугун',
  'Васька Хмырь', 'Димон Горелый', 'Серёга Вилы', 'Юрец Костыль', 'Петруха Гнилой', 'Макс Удавка',
  // Прозвища
  'Хмурый Гном', 'Тихий Ужас', 'Пьяный Гоблин', 'Злой Ботан', 'Рыжая Бестия', 'Серый Волк',
  'Костолом', 'Хитрый Лис', 'Железный Дровосек', 'Ночной Сторож', 'Лысый Череп', 'Громила',
  'Атаман', 'Чёрная Кошка', 'Бродяга', 'Безухий', 'Могильщик', 'Одноглазый Йост',
  'Рваное Ухо', 'Тихоня', 'Гнида', 'Хряк', 'Сопляк', 'Косой', 'Плешивый', 'Борода',
  'Каторжник', 'Висельник', 'Пустобрёх', 'Заика', 'Беспалый', 'Кривозуб', 'Жердь', 'Пень',
  // По ремеслу и месту
  'Кузнец Макар', 'Мельник Тит', 'Чумной Писарь', 'Палач Федя', 'Хромой Пётр', 'Дезертир',
  'Коновал Прошка', 'Живодёр', 'Кожемяка', 'Золотарь Фрол', 'Звонарь', 'Батрак Ерёма',
  'Угольщик', 'Лодочник Яшка', 'Плотник Клим', 'Пастух Онисим', 'Крысолов', 'Конюх Егорка',
  'Старый Браконьер', 'Солдатская Вдова', 'Попович', 'Сын Мясника', 'Племянник Хозяина', 'Чья-то Тёща',
  // Пришлые
  'Варяг', 'Немой Швед', 'Цыган Радо', 'Ганс Голова', 'Черкес', 'Татарин Азамат',
  'Монах-расстрига', 'Беглый Холоп', 'Ляшский Шляхтич', 'Купец-погорелец', 'Пилигрим', 'Знахарь',
];

/** Общие строки — про любого. */
const FLAVOR = [
  'Пришёл за лёгкими деньгами.',
  'Дерётся за еду.',
  'Любит бить по ногам.',
  'Никогда не держит блок дважды.',
  'Говорят, бывший чемпион.',
  'Смотрит на тебя как на мясо.',
  'Разминается уже час.',
  'Ищет, с кем бы подраться.',
  'Хромает, но опасен.',
  'Пахнет перегаром и кровью.',
  'Сбежал с галер, говорят.',
  'Должен Хозяину. Много.',
  'Не моргает.',
  'Пережил чуму. Теперь ничего не боится.',
  'Дерётся, чтобы не идти в шахту.',
  'Вчера проиграл. Сегодня зол.',
  'На руках следы от кандалов.',
  'Крестится перед боем. Потом бьёт в пах.',
  'Говорит, что просто мимо проходил.',
  'Жена ждёт у входа с кошелём.',
  'Уже ставил на себя. Всё, что было.',
  'Зубов нет. Злости — на троих.',
  'Шрамов больше, чем лет.',
  'В прошлый раз его вынесли. Пришёл сам.',
];

export type ArchetypeName = 'воин' | 'ловкач' | 'критовик' | 'танк' | 'универсал';

type Archetype = { name: ArchetypeName; weights: Record<StatKey, number>; flavors: string[] };

const ARCHETYPES: Archetype[] = [
  {
    name: 'воин',
    weights: { strength: 4, dexterity: 1, intuition: 1, endurance: 3 },
    flavors: ['Бьёт редко, но после его ударов встают не все.', 'Кулаки как кувалды, голова как кувалда тоже.', 'Увернуться не пытается. Зачем, если можно бить.'],
  },
  {
    name: 'ловкач',
    weights: { strength: 1, dexterity: 4, intuition: 2, endurance: 2 },
    flavors: ['Попробуй попади. Многие пробовали.', 'Пляшет, зараза. Бьёт, когда устанешь.', 'Худой, быстрый, скользкий, как угорь из реки.'],
  },
  {
    name: 'критовик',
    weights: { strength: 2, dexterity: 1, intuition: 4, endurance: 2 },
    flavors: ['Ждёт твою ошибку. Одну. Больше не надо.', 'Бьёт туда, где броня тоньше, и знает, где это.', 'Глаза нехорошие. Видит, куда ты пойдёшь, раньше тебя.'],
  },
  {
    name: 'танк',
    weights: { strength: 2, dexterity: 1, intuition: 1, endurance: 5 },
    flavors: ['Стоит, как стена. Стены тоже иногда падают, но не сегодня.', 'Его били всем городом. Он не заметил.', 'Пока ты устанешь его бить, он отдохнёт.'],
  },
  {
    name: 'универсал',
    weights: { strength: 2, dexterity: 2, intuition: 2, endurance: 2 },
    flavors: ['Ничего особенного. Этим и опасен.', 'Умеет всё понемногу, в том числе и выигрывать.', 'Не угадаешь, чем он тебя возьмёт. Он сам ещё не решил.'],
  },
];

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Раскидывает очки по весам архетипа, итог — столько же очков, сколько у игрока того же уровня. */
function rollStats(level: number, arch: Archetype, rng: Rng): Stats {
  const stats = baseStats();
  let points = statPointsTotal(level) - STAT_KEYS.reduce((s, k) => s + stats[k], 0);
  const total = STAT_KEYS.reduce((s, k) => s + arch.weights[k], 0);
  while (points > 0) {
    let r = rng() * total;
    for (const k of STAT_KEYS) {
      r -= arch.weights[k];
      if (r <= 0) {
        stats[k] += 1;
        break;
      }
    }
    points -= 1;
  }
  return stats;
}

function meetsRequirements(stats: Stats, req?: Partial<Record<StatKey, number>>): boolean {
  if (!req) return true;
  return STAT_KEYS.every((k) => (req[k] ?? 0) <= stats[k]);
}

/**
 * Экипировка бота. `gearScale` в [0..1] режет шансы на каждый слот —
 * так «слабый» соперник в зале приходит почти голым, а «сильный» — одетым.
 */
function rollGear(level: number, stats: Stats, gearScale: number, rng: Rng): string[] {
  const ids: string[] = [];
  const chance: Record<Slot, number> = {
    weapon: 0.9, shield: 0.3, helmet: 0.5, armor: 0.6, gloves: 0.4, belt: 0.4, pants: 0.5, boots: 0.5,
    ring1: 0.4, ring2: 0.25, amulet: 0.4,
  };
  let twoHanded = false;
  for (const slot of SLOTS) {
    // Щит при двуручнике не носят — то же правило, что у игрока.
    if (slot === 'shield' && twoHanded) continue;
    if (rng() >= (chance[slot] + level * 0.05) * gearScale) continue;
    const catalogSlot = itemSlotOf(slot);
    const options = ITEMS.filter((i) => i.slot === catalogSlot && i.level <= level && meetsRequirements(stats, i.requires));
    if (options.length === 0) continue;
    // Предпочитаем предметы ближе к уровню бота.
    const best = options.filter((i) => i.level >= level - 1);
    const chosen = pick(rng, best.length > 0 ? best : options);
    if (slot === 'weapon' && chosen.twoHanded) twoHanded = true;
    ids.push(chosen.id);
  }
  return ids;
}

export function generateOpponent(level: number, rng: Rng, usedNames: Set<string> = new Set(), gearScale = 1, archetype?: ArchetypeName, origin?: { side: SideId; race?: RaceId }): Opponent {
  const lvl = Math.max(0, level);
  // Сторона и раса бота: заданные или случайные. Расовая черта считается в derived, +1 к характеристике не даём —
  // очков у бота столько же, сколько у игрока того же уровня, и так честнее.
  const side = origin?.side ?? randomSide(rng);
  const race = origin?.race ?? randomRace(side, rng);
  const arch = ARCHETYPES.find((a) => a.name === archetype) ?? pick(rng, ARCHETYPES);
  const stats = rollStats(lvl, arch, rng);
  const itemIds = rollGear(lvl, stats, Math.max(0, Math.min(1, gearScale)), rng);
  let name = pick(rng, NAMES);
  let guard = 0;
  while (usedNames.has(name) && guard < 20) {
    name = pick(rng, NAMES);
    guard += 1;
  }
  usedNames.add(name);
  return {
    id: `${Date.now().toString(36)}-${Math.floor(rng() * 1e9).toString(36)}`,
    name,
    level: lvl,
    stats,
    itemIds,
    derived: deriveStats(stats, lvl, itemIds, [], race),
    flavor: `${arch.name[0].toUpperCase()}${arch.name.slice(1)}. ${pick(rng, rng() < 0.5 ? arch.flavors : FLAVOR)}`,
    side,
    race,
  };
}

/**
 * Список соперников в зале: один слабее (почти без вещей), двое равных, один сильнее (одет).
 * На нулевом уровне у игрока ещё нет шмота, поэтому боты там тоже ходят полуголыми.
 */
export function generateArena(playerLevel: number, rng: Rng, first?: Opponent): Opponent[] {
  const base = Math.min(1, 0.4 + playerLevel * 0.2);
  // С 3-го уровня равные соперники одеты полностью — иначе игрок в лучшем шмоте выигрывает 9 боёв из 10.
  const equal = playerLevel >= 3 ? 1 : 0.8;
  const tiers: { level: number; gear: number }[] = [
    { level: playerLevel - 1, gear: base * 0.4 },
    { level: playerLevel, gear: base * equal },
    { level: playerLevel, gear: base * equal },
    { level: playerLevel + 1, gear: base },
  ];
  const used = new Set<string>(first ? [first.name] : []);
  const rest = tiers.map((t) => generateOpponent(Math.max(0, t.level), rng, used, t.gear));
  // Именной соперник занимает первое место, вытесняя одного случайного.
  return first ? [first, ...rest.slice(1)] : rest;
}
