import type { Character } from './types';
import type { QuestEvent } from './quests';
import type { ResourceId } from './wilds';
import type { LocationId } from './world';
import type { SideId } from './races';

// Сюжет и склонность. Цепочки заданий из 4–6 шагов с развилками; события приходят из `track()` стора
// (как у доски пивной), условия по состоянию (уровень, кредиты, ресурсы, место, гильдия) проверяются
// при любом событии и при входе в пивную. Выборы на развилках двигают склонность персонажа от −100
// (тёмная) до +100 (светлая), склонность меняет цены, реплики именных и открывает два умения.
// Чистая логика без React: стор применяет возвращённые эффекты (кредиты, опыт, вещь, титул, реплика в чат).

// ─── Склонность ────────────────────────────────────────────────────────────

export const ALIGNMENT_MIN = -100;
export const ALIGNMENT_MAX = 100;

export type AlignmentTone = 'light' | 'dark' | null;

export function clampAlignment(a: number): number {
  return Math.max(ALIGNMENT_MIN, Math.min(ALIGNMENT_MAX, Math.round(a)));
}

/** Как персонажа зовут за глаза по склонности: от «Святоши» до «Чёрного». */
export function alignmentName(a: number): string {
  if (a >= 60) return 'Святоша';
  if (a >= 20) return 'Честный';
  if (a > -20) return 'Никакой';
  if (a > -60) return 'Гнилой';
  return 'Чёрный';
}

/** Оттенок для реплик именных: заметен с ±20, крайности — умения с ±60. */
export function alignmentTone(a: number): AlignmentTone {
  if (a >= 20) return 'light';
  if (a <= -20) return 'dark';
  return null;
}

/** Порог умений «Чистая совесть» и «Чёрное сердце». */
export const ALIGNMENT_PERK_AT = 60;

/**
 * Цены по склонности, до ±5 %. Лекарь — бывший полковой цирюльник, честным верит в долг: светлым дешевле.
 * Ломбардщик с гнилыми — свой: тёмным дешевле в лавке. На нуле ничего не меняется.
 */
export function alignmentPriceMult(a: number, place: 'healer' | 'shop'): number {
  const k = clampAlignment(a) / 100; // −1..1
  return place === 'healer' ? 1 - 0.05 * k : 1 + 0.05 * k;
}

/** Цена вещи в лавке для этого персонажа. */
export function shopPrice(c: Pick<Character, 'alignment'>, item: { price: number }): number {
  return Math.max(1, Math.round(item.price * alignmentPriceMult(c.alignment ?? 0, 'shop')));
}

// ─── Структура цепочек ─────────────────────────────────────────────────────

export type StoryId = 'tolyan-debt' | 'nyura-fourth' | 'soldier-charter' | 'butcher-apron' | 'pass-road' | 'crown-guard' | 'free-ferry';

/** Что получает игрок: за шаг, за выбор или за цепочку целиком. */
export interface StoryReward {
  kredits?: number;
  exp?: number;
  /** id вещи из каталога. */
  item?: string;
  title?: string;
  alignment?: number;
  /** Доступ или память мира: флаг в `StoryState.flags` (например, устав Солдата для гильдий). */
  flag?: string;
}

/** Что забрать у игрока при закрытии шага (шкуры на могилу, дрова на лодку). */
export interface StoryTake {
  resource?: { id: ResourceId; amount: number };
  kredits?: number;
}

export type StoryCondition =
  /** Событие из `track()`; `detail` — id именного, стороны соперника, локации или арены. */
  | { kind: 'event'; event: QuestEvent; count?: number; detail?: string }
  | { kind: 'level'; min: number }
  | { kind: 'kredits'; min: number }
  | { kind: 'resource'; id: ResourceId; min: number }
  | { kind: 'location'; id: LocationId }
  | { kind: 'guild' }
  /** Развилка: шаг закрывается выбором игрока. */
  | { kind: 'choice' };

export interface StoryChoice {
  /** Надпись на кнопке. */
  label: string;
  /** Что из этого вышло: строка под шагом после выбора. */
  outcome: string;
  reward?: StoryReward;
  /** Кто и что скажет в пивной после выбора. */
  say?: StorySay;
}

export interface StorySay {
  /** id голоса из `NPC_VOICES` / именного; нет — слово от имени мира. */
  who?: string;
  text: string;
}

export interface StoryStep {
  id: string;
  /** Коротко, что сделать: заголовок карточки. */
  task: string;
  /** Слова того, кто даёт шаг. */
  text: string;
  condition: StoryCondition;
  choices?: [StoryChoice, StoryChoice];
  /** Награда сразу по закрытии шага (не за развилку — у неё своя). */
  reward?: StoryReward;
  take?: StoryTake;
  /** Реплика в чат по закрытии шага. */
  say?: StorySay;
}

export interface StoryChain {
  id: StoryId;
  title: string;
  /** Кто ведёт линию. */
  giver: string;
  /** Пара строк — зачем это всё. */
  intro: string;
  /** Когда линия появляется на доске. */
  starts: (c: Character) => boolean;
  /** Только для стороны. */
  side?: SideId;
  steps: StoryStep[];
  reward: StoryReward;
  /** Слова на прощание — показываются с кнопкой «Забрать». */
  outro: string;
}

export interface StoryProgress {
  id: StoryId;
  /** Индекс текущего шага; равен числу шагов, когда линия пройдена. */
  step: number;
  /** Счётчики событий по id шага. */
  counts: Record<string, number>;
  /** Сделанные выборы: id шага → 0 или 1. */
  choices: Record<string, 0 | 1>;
  /** Ждёт выбора игрока на текущем шаге. */
  awaiting: boolean;
  claimed: boolean;
}

export interface StoryState {
  chains: StoryProgress[];
  flags: string[];
}

/** Что стор должен применить после шага: награды, реплики, снятое. */
export interface StoryEffect {
  chainId: StoryId;
  stepId: string;
  reward?: StoryReward;
  take?: StoryTake;
  say?: StorySay;
  /** Цепочка пройдена целиком, награда ждёт в пивной. */
  finished?: boolean;
}

export interface StoryContext {
  character: Character;
  inGuild: boolean;
}

export interface StoryEvent {
  event: QuestEvent;
  amount?: number;
  detail?: string;
}

// ─── Цепочки ───────────────────────────────────────────────────────────────

const ev = (event: QuestEvent, count = 1, detail?: string): StoryCondition => ({ kind: 'event', event, count, detail });

/**
 * Семь линий. Пять общих и по одной стартовой на сторону. Тон — пивная: коротко, зло, с ухмылкой.
 * Светлый выбор не всегда беднее тёмного, но тёмный почти всегда даёт кредиты сразу.
 */
export const STORY_CHAINS: StoryChain[] = [
  {
    id: 'tolyan-debt',
    title: 'Толян и долг',
    giver: 'Хозяйка Марфа',
    intro: 'Толян должен Марфе за три кувшина и ещё за два, которых не помнит. Долги у нас выбивают.',
    starts: () => true,
    steps: [
      {
        id: 'beat',
        task: 'Побей Толяна в подвале',
        text: 'Марфа: «Толян должен мне с осени. Побей его — у битого память лучше».',
        condition: ev('rivalWin', 1, 'tolyan'),
        say: { who: 'tolyan', text: 'Э, это не долг был, это пиво в долг. Разница есть.' },
      },
      {
        id: 'again',
        task: 'Побей Толяна ещё раз',
        text: 'Марфа: «Сказал — денег нет, но есть брат. Побей ещё раз, пусть брата зовёт».',
        condition: ev('rivalWin', 1, 'tolyan'),
        reward: { exp: 10 },
        say: { who: 'tolyan', text: 'Брат в шахте. Брат занят. Я сам отдам. Когда-нибудь.' },
      },
      {
        id: 'boot',
        task: 'Развилка: двадцать из сапога',
        text: 'Толян выгреб из сапога 20 кр. и шепчет: «Скажи Марфе, что отдал всё». Долг — сорок.',
        condition: { kind: 'choice' },
        choices: [
          {
            label: 'Отнести Марфе честно: двадцать, остальное выбью',
            outcome: 'Марфа пересчитала и кивнула. Остальное с тебя не спросит.',
            reward: { alignment: 5 },
            say: { who: 'marfa', text: 'Честный принёс двадцать. Честный в этом городе — это диагноз, но мне нравится.' },
          },
          {
            label: 'Сказать, что Толян отдал всё, двадцать — себе',
            outcome: 'Марфа посмотрела долго. Двадцать у тебя. Долг тоже где-то у тебя.',
            reward: { alignment: -5, kredits: 20 },
            say: { who: 'marfa', text: 'Толян, говорят, отдал всё. Толян. Всё. Запишу, Гришка, запиши и ты.' },
          },
        ],
      },
      {
        id: 'grow',
        task: 'Дорасти до 1 уровня',
        text: 'Марфа: «С сопляками дел не веду. Подрасти, потом поговорим про остальное».',
        condition: { kind: 'level', min: 1 },
      },
      {
        id: 'close',
        task: 'Выиграй два боя — Марфа смотрит',
        text: 'Марфа: «Долг закрою, если ты не сдуешься. Два боя, при мне».',
        condition: ev('fightWin', 2),
      },
    ],
    reward: { kredits: 30, exp: 25, item: 'club' },
    outro: 'Марфа: «Долг закрыт. Держи твоё — и дубину Толяна. Он её в залог оставил и не выкупил. Теперь ты знаешь, чем он дерётся».',
  },
  {
    id: 'nyura-fourth',
    title: 'Вдова Нюра и четвёртый',
    giver: 'Вдова Нюра',
    intro: 'Нюра похоронила троих. Четвёртого присматривает. Говорят, присмотрела.',
    starts: (c) => c.level >= 1,
    steps: [
      {
        id: 'stand',
        task: 'Побей Нюру',
        text: 'Нюра: «Четвёртым хочешь, милок? Сначала выстой. Побей меня, тогда поговорим».',
        condition: ev('rivalWin', 1, 'nyura'),
        say: { who: 'nyura', text: 'Устоял. Первый мой тоже устоял. Один раз.' },
      },
      {
        id: 'pelts',
        task: 'Принеси 3 шкуры',
        text: 'Нюра: «Первого звали Прохор. Любил шкуры. Принеси три, положу на могилу. Ему всё равно, мне нет».',
        condition: { kind: 'resource', id: 'pelts', min: 3 },
        take: { resource: { id: 'pelts', amount: 3 } },
        reward: { exp: 15 },
      },
      {
        id: 'butcher',
        task: 'Побей Мясника — за Фрола',
        text: 'Нюра: «Второго, Фрола, Мясник разделал. На арене, при всех. Побей его. За Фрола. И за меня».',
        condition: ev('rivalWin', 1, 'butcher'),
        say: { who: 'butcher', text: 'Фрол был хрящ. Этот — не хрящ. Пока.' },
      },
      {
        id: 'ring',
        task: 'Развилка: ларец с кольцами',
        text: 'Нюра открыла ларец: три кольца, три мужа. «Четвёртое — твоё. Бери, если не боишься».',
        condition: { kind: 'choice' },
        choices: [
          {
            label: 'Взять кольцо и пообещать. Обещания дешёвые',
            outcome: 'Кольцо у тебя. Нюра улыбнулась. Это хуже, чем если бы не улыбнулась.',
            reward: { alignment: -6, item: 'bone-ring' },
            say: { who: 'nyura', text: 'Четвёртый взял кольцо. Свечку куплю потолще, этот подороже выйдет.' },
          },
          {
            label: 'Отказаться: третьего ещё не отплакала',
            outcome: 'Нюра закрыла ларец. Дала на свечку. Не поминальную — впервые за десять лет.',
            reward: { alignment: 4, kredits: 40 },
            say: { who: 'nyura', text: 'Отказался. Умный. Первый умный за десять лет, и тот не мой.' },
          },
        ],
      },
      {
        id: 'three',
        task: 'Три победы подряд не обязательно, просто три',
        text: 'Нюра: «Покажи, что на ногах держишься. Три победы, и я решу, кто ты мне».',
        condition: ev('fightWin', 3),
      },
    ],
    reward: { kredits: 50, exp: 60, title: 'Выстоявший' },
    outro: 'Нюра: «Жив. Трое не смогли, ты смог. Платок сниму. Не ради тебя — надоел».',
  },
  {
    id: 'soldier-charter',
    title: 'Старый Солдат и устав',
    giver: 'Старый Солдат',
    intro: 'Две войны прошёл, третью ведёт в подвале. Обещал устав тому, кто побьёт дважды.',
    starts: (c) => c.level >= 2,
    steps: [
      {
        id: 'drill',
        task: 'Выйди в подвал 5 раз',
        text: 'Солдат: «Стойка — дрянь. Выйди пять раз. Не победить — выстоять. Победы потом».',
        condition: ev('fightPlay', 5),
        reward: { exp: 15 },
      },
      {
        id: 'first',
        task: 'Побей Солдата',
        text: 'Солдат: «Теперь меня. Один раз. Дважды — устав напишу, я обещал, я помню».',
        condition: ev('rivalWin', 1, 'soldier'),
        say: { who: 'soldier', text: 'Годишься. Второй раунд был твой. Так и бей.' },
      },
      {
        id: 'repair',
        task: 'Почини вещь у Макара',
        text: 'Солдат: «В рванье не воюют. К Макару. Проиграл до боя тот, кто вышел в дырах».',
        condition: ev('repair', 1),
      },
      {
        id: 'bart',
        task: 'Развилка: спор Барта',
        text: 'Первый пункт устава — «своих не бьём за деньги». Хромой Барт как раз ставит на то, что ты уложишь Солдата. Платит вперёд.',
        condition: { kind: 'choice' },
        choices: [
          {
            label: 'Отказать Барту. Устав есть устав',
            outcome: 'Барт хмыкнул и ушёл хромать в другую сторону. Солдат видел. Промолчал — это у него похвала.',
            reward: { alignment: 5, exp: 20 },
            say: { who: 'soldier', text: 'Отказал Барту при мне. Устав ещё не написан, а уже работает.' },
          },
          {
            label: 'Взять деньги Барта. Побьёшь — не побьёшь, его дело',
            outcome: 'Тридцать пять кредитов Барта в кармане. Солдат не узнал. Пока.',
            reward: { alignment: -5, kredits: 35 },
            say: { who: 'bart', text: 'Поставил на новенького. Если проиграет — хоть посмеюсь, если выиграет — заработаю.' },
          },
        ],
      },
      {
        id: 'second',
        task: 'Побей Солдата второй раз',
        text: 'Солдат: «Второй раз. Побьёшь — устав наш. Не побьёшь — тоже наш, но позже».',
        condition: ev('rivalWin', 1, 'soldier'),
        say: { who: 'soldier', text: 'Дважды. Устав пишу. Чернил мало, пунктов будет три.' },
      },
      {
        id: 'guild',
        task: 'Вступи в гильдию или основай свою',
        text: 'Солдат: «Теперь — в гильдию. Любую. Один в поле не воин, один в поле — мишень».',
        condition: { kind: 'guild' },
      },
    ],
    reward: { kredits: 80, exp: 100, title: 'По уставу', flag: 'charter' },
    outro: 'Солдат: «Устав написан. Три пункта: своих не бить, строй не ломать, Солдата слушать. С этой бумагой ты в любой гильдии свой».',
  },
  {
    id: 'butcher-apron',
    title: 'Мясник и фартук',
    giver: 'Мясник',
    intro: 'Мясник разделывает туши. Ему всё равно, чьи. Цех смотрит, кому отдать запасной фартук.',
    starts: (c) => c.level >= 2,
    steps: [
      {
        id: 'blood',
        task: 'Три победы в подвале',
        text: 'Мясник: «Фартук. Чистый. Испачкай — три победы. Кровь не твоя».',
        condition: ev('fightWin', 3),
      },
      {
        id: 'pelts',
        task: 'Принеси 5 шкур',
        text: 'Мясник: «Шкуры. Пять. С кого — не спрашиваю. Цех не спрашивает».',
        condition: { kind: 'resource', id: 'pelts', min: 5 },
        take: { resource: { id: 'pelts', amount: 5 } },
        reward: { kredits: 25 },
      },
      {
        id: 'shadow-deal',
        task: 'Развилка: Тень платит за молчание',
        text: 'Мясник кивнул на Тень: «Должна Цеху. Разберись». Тень нашла тебя первой и предлагает вдвое — за то, что ты её «не нашёл».',
        condition: { kind: 'choice' },
        choices: [
          {
            label: 'Взять у Тени и соврать Мяснику',
            outcome: 'Пятьдесят кредитов Тени. Мясник слушал твою ложь и жевал. Потом сказал: «Хрящ».',
            reward: { alignment: -8, kredits: 50 },
            say: { who: 'shadow', text: 'Купился. Дёшево. Запомню цену.' },
          },
          {
            label: 'Отказать Тени: Цех ждёт',
            outcome: 'Тень растворилась раньше, чем ты договорил. Мясник кивнул. Для него это речь.',
            reward: { alignment: 3, exp: 20 },
            say: { who: 'shadow', text: 'Отказался от денег. Либо дурак, либо дорогой. Выясню.' },
          },
        ],
      },
      {
        id: 'shadow',
        task: 'Побей Тень',
        text: 'Мясник не поверил ни слову и не поверил бы правде. «Тень. В подвал. Я смотрю».',
        condition: ev('rivalWin', 1, 'shadow'),
        say: { who: 'butcher', text: 'Тень лежала. Видел. Цех видел.' },
      },
      {
        id: 'apron',
        task: 'Развилка: фартук',
        text: 'Мясник протягивает фартук: «Твой. Цех берёт тех, кто не брезгует». Кровь на нём — не твоя и не его.',
        condition: { kind: 'choice' },
        choices: [
          {
            label: 'Надеть',
            outcome: 'Фартук пахнет бойней. Теперь и ты тоже. Цех запомнил лицо.',
            reward: { alignment: -10, title: 'Подмастерье Цеха', flag: 'apron' },
            say: { who: 'butcher', text: 'Надел. Подмастерье. Тесак потом, сначала руки.' },
          },
          {
            label: 'Отказаться: туши резать — не твоё',
            outcome: 'Мясник сложил фартук и убрал. Дал тридцать — «за Тень». Больше не позовёт.',
            reward: { alignment: 5, kredits: 30 },
            say: { who: 'butcher', text: 'Отказался от фартука. Мясо. Крепкое, но мясо.' },
          },
        ],
      },
      {
        id: 'last',
        task: 'Побей кого-нибудь на уровень выше',
        text: 'Мясник: «Последнее. Положи того, кто выше тебя. Цех на мелочь не смотрит».',
        condition: ev('fightWinStronger', 1),
      },
    ],
    reward: { kredits: 70, exp: 90, item: 'hatchet' },
    outro: 'Мясник: «Хрящ. Но свой хрящ». Протягивает топорик: «Для туш. Или для кого хочешь».',
  },
  {
    id: 'pass-road',
    title: 'Перевал',
    giver: 'Слепой Кузьма',
    intro: 'За перевалом Брод: вольный город без князя и без клуба. Кузьма тридцать лет не ходил. Сходи за него.',
    starts: (c) => c.level >= 3,
    steps: [
      {
        id: 'brod',
        task: 'Дойди до Брода',
        text: 'Кузьма: «Перевал, потом Брод. Я слышу, как оттуда звенят. Сходи, расскажешь, чем».',
        condition: { kind: 'location', id: 'brod' },
        reward: { exp: 20 },
        say: { who: 'kuzma', text: 'Новенький дошёл до Брода. Шаги тяжелее стали — значит, там платят.' },
      },
      {
        id: 'caravan',
        task: 'Отработай ходку с караваном',
        text: 'Купцы Брода: «Караван через перевал. Охрана нужна. Платим после, если дойдёшь».',
        condition: ev('caravan', 1),
      },
      {
        id: 'bandits',
        task: 'Развилка: доля разбойников',
        text: 'Разбойники с перевала знают тебя в лицо и предлагают долю: «не замечай нас». Фома в Городе хочет их имена.',
        condition: { kind: 'choice' },
        choices: [
          {
            label: 'Сдать имена Фоме',
            outcome: 'Фома записал имена и выдал княжью награду. Разбойники тоже запишут. Тебя.',
            reward: { alignment: 6, kredits: 40 },
            say: { who: 'foma', text: 'Имена с перевала принесли. Указу пять лет, а работает. Иногда.' },
          },
          {
            label: 'Взять долю и промолчать',
            outcome: 'Шестьдесят кредитов за то, чтобы смотреть в другую сторону. Смотреть ты умеешь.',
            reward: { alignment: -6, kredits: 60 },
            say: { who: 'kuzma', text: 'Кто-то с перевала пришёл с чужими деньгами в сапоге. Звенят иначе, чем свои.' },
          },
        ],
      },
      {
        id: 'ore',
        task: 'Принеси 4 куска руды',
        text: 'Кузнецы Брода: «Руда с перевала. Четыре куска. Макару не говори — у него своя».',
        condition: { kind: 'resource', id: 'ore', min: 4 },
        take: { resource: { id: 'ore', amount: 4 } },
        reward: { kredits: 30 },
      },
      {
        id: 'arena',
        task: 'Три победы на арене Брода',
        text: 'Перевозчики: «В Броде ты никто. Три победы на их арене — и будешь никто со счётом».',
        condition: ev('fightWin', 3, 'brod'),
      },
    ],
    reward: { kredits: 120, exp: 150, title: 'Ходивший за перевал' },
    outro: 'Кузьма: «Вернулся. Звенишь. Тридцать лет сидел и думал, как там. Теперь знаю: как здесь, только платят».',
  },
  {
    id: 'crown-guard',
    title: 'Поручение стражи',
    giver: 'Стражник Фома',
    side: 'crown',
    intro: 'Князю нужны руки, страже — глаза. Фома смотрит, кто из своих стоит на ногах.',
    starts: (c) => c.side === 'crown',
    steps: [
      {
        id: 'show',
        task: 'Выйди в подвал 3 раза',
        text: 'Фома: «Стража смотрит, кто стоит, а кто падает. Выйди три раза. Падать можно».',
        condition: ev('fightPlay', 3),
      },
      {
        id: 'free',
        task: 'Побей двоих вольных',
        text: 'Фома: «Вольница шумит. Побей двоих вольных — Толяна, Мясника, Тень, кого достанешь. Чтоб знали».',
        condition: ev('sideWin', 2, 'free'),
        reward: { exp: 20 },
        say: { who: 'foma', text: 'Двоих вольных уложили. Записываю в ведомость. Князь не прочтёт, но пусть лежит.' },
      },
      {
        id: 'ledger',
        task: 'Развилка: ведомость Гришки',
        text: 'Гришка записал тебя на двойную плату. По ошибке. Он не заметит — он никогда не замечает.',
        condition: { kind: 'choice' },
        choices: [
          {
            label: 'Сказать Гришке',
            outcome: 'Гришка переписал, пробормотал «честный» и записал это чёрным. У него чёрным — хорошее.',
            reward: { alignment: 4, exp: 15 },
            say: { who: 'grishka', text: 'Один сам пришёл исправлять ведомость. Записал. Чёрным. Такое раз в год.' },
          },
          {
            label: 'Взять двойную',
            outcome: 'Тридцать кредитов княжьих. Гришка не заметил. Фома заметил, но Фома и сам брал.',
            reward: { alignment: -4, kredits: 30 },
            say: { who: 'grishka', text: 'В ведомости не сходится на тридцать. Опять. Кто-то у меня ест.' },
          },
        ],
      },
      {
        id: 'goods',
        task: 'Сдай 10 шт. в лавку',
        text: 'Фома: «Город без товара, караван ушёл. Сдай десять чего угодно в лавку. Князь любит полные полки».',
        condition: ev('sellResources', 10),
      },
    ],
    reward: { kredits: 60, exp: 70, title: 'На княжьей службе' },
    outro: 'Фома: «Годишься. Князь не узнает твоего имени, но плату прислал. Это у нас и есть служба».',
  },
  {
    id: 'free-ferry',
    title: 'Просьба Перевозчиков',
    giver: 'Перевозчики',
    side: 'free',
    intro: 'Лодочники с переправы и те, кто носит через болото. «Река всё спишет». Своим помогают, чужих топят.',
    starts: (c) => c.side === 'free',
    steps: [
      {
        id: 'wood',
        task: 'Принеси 5 дров',
        text: 'Перевозчик: «Лодка течёт. Пять поленьев — на доски и смолу. Лес рядом, стража далеко».',
        condition: { kind: 'resource', id: 'wood', min: 5 },
        take: { resource: { id: 'wood', amount: 5 } },
        reward: { kredits: 15 },
      },
      {
        id: 'crown',
        task: 'Побей двоих княжьих',
        text: 'Перевозчик: «Стража шарит по лодкам. Побей двоих княжьих — Солдата, Нюру, Барта. Пусть знают, чья река».',
        condition: ev('sideWin', 2, 'crown'),
        reward: { exp: 20 },
      },
      {
        id: 'bale',
        task: 'Развилка: тюк в лодке',
        text: 'В лодке тюк. Перевозчик просит не спрашивать. Фома даёт тридцать за то, что внутри.',
        condition: { kind: 'choice' },
        choices: [
          {
            label: 'Промолчать и взять долю',
            outcome: 'Двадцать пять кредитов и молчание. Река всё спишет. Фома — не река.',
            reward: { alignment: -4, kredits: 25 },
            say: { who: 'foma', text: 'Тюк с переправы ушёл. Кто-то смотрел и не видел. Запомню, кто.' },
          },
          {
            label: 'Сдать тюк Фоме',
            outcome: 'Фома заплатил тридцать и забрал тюк. Перевозчики запомнили. Река ничего не списала.',
            reward: { alignment: 4, kredits: 30 },
            say: { text: 'На переправе говорят: один из своих носит Фоме. Лодочники молчат громче обычного.' },
          },
        ],
      },
      {
        id: 'forest',
        task: 'Сходи в Лес за рекой',
        text: 'Перевозчик: «Пройди Лес до того берега. Лодочники ждут вестей — кто там ходит и чей».',
        condition: { kind: 'location', id: 'forest' },
      },
    ],
    reward: { kredits: 60, exp: 70, title: 'Свой на переправе' },
    outro: 'Перевозчик: «Свой. Лодка твоя — в любой час, в любую сторону. Про тюк не вспоминаем».',
  },
];

export const STORY_BY_ID = Object.fromEntries(STORY_CHAINS.map((c) => [c.id, c])) as Record<StoryId, StoryChain>;

// ─── Состояние ─────────────────────────────────────────────────────────────

export function newStory(): StoryState {
  return { chains: [], flags: [] };
}

export function normalizeStory(raw: Partial<StoryState> | null | undefined): StoryState {
  const chains = (raw?.chains ?? [])
    .filter((p) => !!STORY_BY_ID[p.id])
    .map((p) => ({
      id: p.id,
      step: typeof p.step === 'number' ? p.step : 0,
      counts: p.counts ?? {},
      choices: p.choices ?? {},
      awaiting: !!p.awaiting,
      claimed: !!p.claimed,
    }));
  return { chains, flags: raw?.flags ?? [] };
}

function newProgress(id: StoryId): StoryProgress {
  return { id, step: 0, counts: {}, choices: {}, awaiting: false, claimed: false };
}

export function progressOf(state: StoryState, id: StoryId): StoryProgress | undefined {
  return state.chains.find((p) => p.id === id);
}

export function storyStep(p: StoryProgress): StoryStep | null {
  return STORY_BY_ID[p.id].steps[p.step] ?? null;
}

export function chainFinished(p: StoryProgress): boolean {
  return p.step >= STORY_BY_ID[p.id].steps.length;
}

/** Линии, которые пора открыть: условие старта выполнено, сторона совпадает, ещё не начаты. */
export function availableChains(state: StoryState, c: Character): StoryChain[] {
  return STORY_CHAINS.filter((ch) => !progressOf(state, ch.id) && (!ch.side || ch.side === c.side) && ch.starts(c));
}

/** Открыть всё доступное. Возвращает то же состояние, если нечего открывать. */
export function startChains(state: StoryState, c: Character): StoryState {
  const fresh = availableChains(state, c);
  if (fresh.length === 0) return state;
  return { ...state, chains: [...state.chains, ...fresh.map((ch) => newProgress(ch.id))] };
}

function eventMatches(cond: StoryCondition, e: StoryEvent): boolean {
  if (cond.kind !== 'event' || cond.event !== e.event) return false;
  return !cond.detail || cond.detail === e.detail;
}

/** Выполнено ли условие шага при текущем счёте и состоянии. Развилка сама не закрывается. */
export function stepMet(step: StoryStep, p: StoryProgress, ctx: StoryContext): boolean {
  const cond = step.condition;
  const c = ctx.character;
  switch (cond.kind) {
    case 'event':
      return (p.counts[step.id] ?? 0) >= (cond.count ?? 1);
    case 'level':
      return c.level >= cond.min;
    case 'kredits':
      return c.kredits >= cond.min;
    case 'resource':
      return (c.resources[cond.id] ?? 0) >= cond.min;
    case 'location':
      return c.location === cond.id;
    case 'guild':
      return ctx.inGuild;
    case 'choice':
      return false;
  }
}

/** Прогресс шага-события для полоски: [сделано, нужно]; у остальных шагов — [0, 1] или [1, 1]. */
export function stepProgress(step: StoryStep, p: StoryProgress, ctx: StoryContext): [number, number] {
  const cond = step.condition;
  if (cond.kind === 'event') return [Math.min(cond.count ?? 1, p.counts[step.id] ?? 0), cond.count ?? 1];
  if (cond.kind === 'resource') return [Math.min(cond.min, ctx.character.resources[cond.id] ?? 0), cond.min];
  return [stepMet(step, p, ctx) ? 1 : 0, 1];
}

/**
 * Применить событие (или просто перепроверить состояние, если `event` не задан) ко всем открытым линиям.
 * Шаги закрываются по одному за вызов: следующий шаг получит своё событие уже отдельно, чтобы один бой
 * не закрывал «побей Толяна» и «побей Толяна ещё раз» разом. Развилка останавливает линию до выбора.
 */
export function applyStoryEvent(state: StoryState, ctx: StoryContext, e?: StoryEvent): { state: StoryState; effects: StoryEffect[] } {
  const effects: StoryEffect[] = [];
  let changed = false;
  const chains = state.chains.map((p) => {
    if (p.claimed || p.awaiting || chainFinished(p)) return p;
    const chain = STORY_BY_ID[p.id];
    const step = chain.steps[p.step];
    let next = p;
    if (e && eventMatches(step.condition, e)) {
      next = { ...p, counts: { ...p.counts, [step.id]: (p.counts[step.id] ?? 0) + (e.amount ?? 1) } };
      changed = true;
    }
    if (step.condition.kind === 'choice') {
      if (!p.awaiting) {
        changed = true;
        return { ...next, awaiting: true };
      }
      return next;
    }
    if (!stepMet(step, next, ctx)) return next;
    changed = true;
    const stepIndex = p.step + 1;
    const finished = stepIndex >= chain.steps.length;
    effects.push({ chainId: p.id, stepId: step.id, reward: step.reward, take: step.take, say: step.say, finished });
    const advanced: StoryProgress = { ...next, step: stepIndex };
    // Следующий шаг — развилка: сразу ставим на ожидание, чтобы кнопки появились без лишнего события.
    const following = chain.steps[stepIndex];
    if (following?.condition.kind === 'choice') return { ...advanced, awaiting: true };
    return advanced;
  });
  return { state: changed ? { ...state, chains } : state, effects };
}

/** Выбор на развилке. Возвращает эффект выбора; линия двигается дальше. */
export function chooseStoryOption(state: StoryState, id: StoryId, option: 0 | 1): { ok: boolean; reason?: string; state: StoryState; effect?: StoryEffect } {
  const p = progressOf(state, id);
  if (!p) return { ok: false, reason: 'Такой линии нет', state };
  const step = storyStep(p);
  if (!step || !p.awaiting || step.condition.kind !== 'choice' || !step.choices) return { ok: false, reason: 'Выбирать нечего', state };
  const choice = step.choices[option];
  const chain = STORY_BY_ID[id];
  const stepIndex = p.step + 1;
  const finished = stepIndex >= chain.steps.length;
  const following = chain.steps[stepIndex];
  const next: StoryProgress = {
    ...p,
    step: stepIndex,
    awaiting: following?.condition.kind === 'choice',
    choices: { ...p.choices, [step.id]: option },
  };
  return {
    ok: true,
    state: { ...state, chains: state.chains.map((x) => (x.id === id ? next : x)) },
    effect: { chainId: id, stepId: step.id, reward: choice.reward, say: choice.say, finished },
  };
}

/** Забрать награду за пройденную линию. Один раз. */
export function claimStoryReward(state: StoryState, id: StoryId): { ok: boolean; reason?: string; state: StoryState; reward?: StoryReward } {
  const p = progressOf(state, id);
  if (!p) return { ok: false, reason: 'Такой линии нет', state };
  if (!chainFinished(p)) return { ok: false, reason: 'Линия ещё не пройдена', state };
  if (p.claimed) return { ok: false, reason: 'Уже забрал', state };
  return {
    ok: true,
    state: { ...state, chains: state.chains.map((x) => (x.id === id ? { ...x, claimed: true } : x)) },
    reward: STORY_BY_ID[id].reward,
  };
}

export function addStoryFlag(state: StoryState, flag: string | undefined): StoryState {
  if (!flag || state.flags.includes(flag)) return state;
  return { ...state, flags: [...state.flags, flag] };
}

export function hasStoryFlag(state: StoryState, flag: string): boolean {
  return state.flags.includes(flag);
}

/** Строка награды для карточки: «+30 кр. · +25 оп. · Дубина». Названия вещей подставляет UI. */
export function rewardText(r: StoryReward | undefined, itemName?: (id: string) => string): string {
  if (!r) return '';
  const parts: string[] = [];
  if (r.kredits) parts.push(`${r.kredits > 0 ? '+' : ''}${r.kredits} кр.`);
  if (r.exp) parts.push(`+${r.exp} оп.`);
  if (r.item) parts.push(itemName ? itemName(r.item) : r.item);
  if (r.title) parts.push(`титул «${r.title}»`);
  if (r.alignment) parts.push(r.alignment > 0 ? `+${r.alignment} к светлой` : `${r.alignment} к тёмной`);
  return parts.join(' · ');
}

/** Открытые линии: сначала ждущие награды и развилки, потом остальные, завершённые в конце. */
export function sortedProgress(state: StoryState): StoryProgress[] {
  const rank = (p: StoryProgress) => (p.claimed ? 3 : chainFinished(p) ? 0 : p.awaiting ? 1 : 2);
  return [...state.chains].sort((a, b) => rank(a) - rank(b));
}

/** Сколько линий требуют внимания: развилка или награда. */
export function storyAttention(state: StoryState): number {
  return state.chains.filter((p) => !p.claimed && (p.awaiting || chainFinished(p))).length;
}
