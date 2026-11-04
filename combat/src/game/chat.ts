import type { Check } from './character';
import type { FightStatus } from './types';
import type { Role } from './roles';

// Чат. Сервера нет, поэтому собеседники — завсегдатаи пивной и знакомые с арены: они болтают сами
// по себе и отвечают на слова игрока по теме. Структура сообщений та же, что будет у сетевого чата
// (см. src/net/backend.ts): когда появится сервер, живые игроки встанут в тот же список.

export type ChannelId = 'tavern' | 'arena' | 'guild';

export interface Channel {
  id: ChannelId;
  name: string;
  hint: string;
}

export const CHANNELS: Channel[] = [
  { id: 'tavern', name: 'Пивная', hint: 'Общий стол. Болтают все, кто не спит.' },
  { id: 'arena', name: 'Арена', hint: 'Сводки боёв и подначки.' },
  { id: 'guild', name: 'Гильдия', hint: 'Свои. Чужие не слышат.' },
];

export const CHANNELS_BY_ID = Object.fromEntries(CHANNELS.map((c) => [c.id, c])) as Record<ChannelId, Channel>;

export type MessageKind = 'player' | 'npc' | 'system' | 'staff';

export interface ChatAuthor {
  id: string;
  name: string;
  /** Тег гильдии, если есть. */
  tag?: string | null;
  /** Служебная роль автора, если он не простой игрок. */
  role?: Role;
}

export interface ChatMessage {
  id: string;
  channel: ChannelId;
  at: number;
  author: ChatAuthor;
  text: string;
  kind: MessageKind;
  /** Удалено смотрящим: игроки не видят, модераторы видят зачёркнутым. */
  deleted?: boolean;
}

/** Ответ собеседника, который придёт через несколько секунд. */
export interface PendingReply {
  at: number;
  channel: ChannelId;
  author: ChatAuthor;
  text: string;
}

export interface ChatState {
  messages: ChatMessage[];
  pending: PendingReply[];
  /** Когда завсегдатаи заговорят сами в следующий раз. */
  nextAmbientAt: number;
  /** Заткнутые авторы: их новые сообщения не проходят. */
  muted: string[];
}

export const CHAT_LIMIT = 200;
export const MESSAGE_MAX = 240;
/** Пауза между репликами завсегдатаев без повода, мс. */
export const AMBIENT_EVERY_MS: [number, number] = [90_000, 240_000];
/** Задержка ответа на слова игрока, мс. */
export const REPLY_DELAY_MS: [number, number] = [3_000, 12_000];

export const WORLD_AUTHOR: ChatAuthor = { id: 'world', name: 'Мир' };

export function emptyChat(now = Date.now()): ChatState {
  return { messages: [], pending: [], nextAmbientAt: now + 20_000, muted: [] };
}

export function normalizeChat(raw: Partial<ChatState> | null | undefined, now = Date.now()): ChatState {
  const base = emptyChat(now);
  if (!raw) return base;
  return {
    messages: Array.isArray(raw.messages) ? raw.messages : base.messages,
    pending: Array.isArray(raw.pending) ? raw.pending : base.pending,
    nextAmbientAt: typeof raw.nextAmbientAt === 'number' ? raw.nextAmbientAt : base.nextAmbientAt,
    muted: Array.isArray(raw.muted) ? raw.muted : base.muted,
  };
}

/** Текст после чистки: обрезка, схлопывание пробелов. Пустой — нельзя. */
export function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MESSAGE_MAX);
}

export function validateMessage(text: string): Check {
  const t = cleanText(text);
  if (!t) return { ok: false, reason: 'Пусто' };
  if (t.length < 1) return { ok: false, reason: 'Коротко' };
  return { ok: true };
}

export function appendMessage(state: ChatState, msg: ChatMessage): ChatState {
  const messages = [...state.messages, msg];
  return { ...state, messages: messages.length > CHAT_LIMIT ? messages.slice(messages.length - CHAT_LIMIT) : messages };
}

/** Что видит читатель: удалённые прячем от игроков, модераторам показываем всё. */
export function visibleMessages(state: ChatState, channel: ChannelId, seeDeleted = false): ChatMessage[] {
  return state.messages.filter((m) => m.channel === channel && (seeDeleted || !m.deleted));
}

export function unreadCount(state: ChatState, since: number, channel?: ChannelId): number {
  return state.messages.filter((m) => m.at > since && !m.deleted && m.kind !== 'system' && (!channel || m.channel === channel)).length;
}

// --- Собеседники -------------------------------------------------------------------------------

export type Topic = 'greet' | 'fight' | 'money' | 'guild' | 'brod' | 'work' | 'heal' | 'staff' | 'insult' | 'default';

export interface NpcVoice {
  id: string;
  name: string;
  /** Реплики без повода. */
  ambient: string[];
  /** Ответы по темам; темы без ответов — молчание этого персонажа. */
  replies: Partial<Record<Topic, string[]>>;
}

export const NPC_VOICES: NpcVoice[] = [
  {
    id: 'tolyan',
    name: 'Гопник Толян',
    ambient: ['Кто мелочь потерял у арены? Нашёл. Не отдам.', 'Э, кто вчера меня уронил — я помню, да.', 'Слышь, пивная, кто ставит?'],
    replies: {
      greet: ['Здарова, чё.', 'Ну здарова. Чё надо?'],
      fight: ['Драться хочешь? Так приходи, я в зале.', 'Удар в голову, блок на пояс. Проверено. Иногда.'],
      money: ['Кредитов нет. А если найду?', 'Шахта платит мало, а я вообще не работаю.'],
      guild: ['Гильдия? Если возьмёте — я за. Взносов не жди.', 'Была у меня гильдия. Два пацана и собака.'],
      insult: ['Э, за базар ответишь. На арене.', 'Слышь, повтори.'],
      staff: ['Ага, ГМ тут. Прям щас.'],
      default: ['Чё?', 'Ну ты сказал, конечно.'],
    },
  },
  {
    id: 'bart',
    name: 'Хромой Барт',
    ambient: ['Нога ноет — к дождю. Или к бою.', 'Кто продаёт дрова? Беру за полцены.'],
    replies: {
      greet: ['Здравствуй.', 'Барт здесь.'],
      fight: ['Не смотри на ногу. Смотри на кулак.', 'Ловкость решает. Сила потом.'],
      money: ['Деньги — в лес. Шкуры, травы. Арена жадная.'],
      brod: ['В Броде платят, но и бьют крепче. Проверено ногой.'],
      heal: ['Лекарь дерёт. Травы дешевле, сам собирал.'],
      default: ['Может быть.', 'Хм.'],
    },
  },
  {
    id: 'nyura',
    name: 'Вдова Нюра',
    ambient: ['Четвёртого всё ищу. Не торопитесь, милые.', 'Платок новый. Кровь отстиралась.'],
    replies: {
      greet: ['Здравствуй, милок.', 'Ну здравствуй.'],
      fight: ['Приходи. Больно не будет. Долго.', 'Уворачивайся, милок. Остальному научат.'],
      guild: ['В гильдию вдов не берут. Я спрашивала.', 'Гильдия — это когда есть кому похоронить.'],
      insult: ['Ай, язык. Язык-то отрежут.'],
      default: ['Да, милок.', 'Слыхала.'],
    },
  },
  {
    id: 'butcher',
    name: 'Мясник',
    ambient: ['Туши кончились. Жду арену.', 'Хрящи. Одни хрящи кругом.'],
    replies: {
      greet: ['Угу.'],
      fight: ['Стой ровно. Так быстрее.', 'Корпус. Всегда корпус.'],
      money: ['Деньги пахнут. Кровью.'],
      work: ['Работа есть. Фартук выдам.'],
      insult: ['...', 'Тесак наточен.'],
      default: ['Угу.', 'Хрящи.'],
    },
  },
  {
    id: 'shadow',
    name: 'Тень',
    ambient: ['…', 'Видели нож. Лица не видел никто.'],
    replies: {
      greet: ['…'],
      fight: ['Ты меня не заметишь.'],
      guild: ['Тени не состоят. Тени следят.'],
      staff: ['Мастер игры — тоже тень. Только громкая.'],
      default: ['…'],
    },
  },
  {
    id: 'soldier',
    name: 'Старый Солдат',
    ambient: ['Две войны прошёл. Третью веду здесь.', 'Новобранцы, стойка — дрянь. Исправим.', 'Броню чини. Броня — это жизнь, а не груз.'],
    replies: {
      greet: ['Здравия.', 'Здравия желаю.'],
      fight: ['Блок ставь туда, куда бьёт уставший. Уставший бьёт по ногам.', 'Крит через блок бывает. Не надейся на щит.'],
      money: ['На войне за мародёрку пороли. Здесь — платят.'],
      guild: ['Гильдия — это строй. Строй держит, когда ты не держишь.', 'Создавай. Только устав напиши.'],
      brod: ['Брод — вольный город. Князя там не любят, зато платят.'],
      work: ['Караван через перевал. Втрое против шахты, но тракт любят разбойники.'],
      heal: ['Травма сама пройдёт. Но лучше к лекарю, если есть чем платить.'],
      staff: ['Мастер игры? Ну-ну. Начальство везде одинаковое.'],
      insult: ['На войне за такое пороли.'],
      default: ['Так точно.', 'Понял.'],
    },
  },
  {
    id: 'marfa',
    name: 'Хозяйка Марфа',
    ambient: ['Кто доску заданий читал — награду забирайте, не держу.', 'Пиво кончается. Бойцы — нет.', 'Слухи новые с утра. Спрашивайте.'],
    replies: {
      greet: ['Здравствуй, боец. Пиво? Работа?', 'Заходи. Ноги вытирай.'],
      money: ['Задания на доске. Платят за сделанное, не за обещания.'],
      work: ['Работа есть: доска у стойки. Три на день.'],
      guild: ['Гильдейский стол — в задней комнате. Основать — двести пятьдесят, с тебя.', 'Гильдии платят за стол. Гильдии получают стол.'],
      heal: ['Лекарь через дорогу. Зелёный фонарь.'],
      staff: ['Мастера игры поят бесплатно. Если он мастер.'],
      insult: ['Ругайся на улице. Здесь — пивная.'],
      default: ['Слышу.', 'Ну-ну.'],
    },
  },
  {
    id: 'grishka',
    name: 'Писарь Гришка',
    ambient: ['Записываю всех. Кто кого бил и за сколько.', 'Чернила кончились. Пишу кровью. Шучу. Пока.'],
    replies: {
      greet: ['Приветствую. Имя? Записываю.'],
      fight: ['В летописи ты пока — строчка. Станешь абзацем, если выживешь.'],
      guild: ['Гильдия в летопись попадает с тегом. Три буквы, не больше четырёх.'],
      staff: ['Мастер игры всё правит. Даже летопись. Особенно летопись.'],
      default: ['Записал.', 'Угу, угу. Записал.'],
    },
  },
  {
    id: 'foma',
    name: 'Стражник Фома',
    ambient: ['Порядок в чате. Ругань — в арену.', 'Кто пьян — домой. Кто трезв — на смену.'],
    replies: {
      greet: ['Здравия.'],
      insult: ['Ещё раз — и затыкаю. Смотрящий слушает.'],
      staff: ['Смотрящий — я. Мастер — выше. Не путай.'],
      brod: ['В Брод — через перевал. Стража там своя, с нами не дружит.'],
      default: ['Проходи.'],
    },
  },
];

export const NPC_VOICES_BY_ID = Object.fromEntries(NPC_VOICES.map((v) => [v.id, v])) as Record<string, NpcVoice>;

const TOPIC_WORDS: [Topic, RegExp][] = [
  ['staff', /(^|[^а-яё])(гм|админ|мастер игры|модер|смотрящ)/i],
  ['insult', /(дурак|идиот|лох|мудак|сука|хуй|бля|пизд|ебан|тварь|урод)/i],
  ['greet', /(^|[^а-яё])(привет|здаров|здоров|здрав|хай|ку(?![а-яё])|добр(ый|ого)|салют|дратути)/i],
  ['guild', /(гильд|клан|устав|тег)/i],
  ['brod', /(брод|перевал|караван)/i],
  ['fight', /(драк|бой|бои|боя|арен|удар|блок|крит|уворот|сопер|побед|проигр)/i],
  ['money', /(кредит|деньг|бабл|бабк|монет|плат|цен|дорог|дёшев|дешев)/i],
  ['heal', /(лекар|травм|болит|лечи|зель|здоров)/i],
  ['work', /(шахт|работ|смен|заработ)/i],
];

/** Тема сообщения по ключевым словам: первая совпавшая из списка по приоритету. `\b` с кириллицей не работает, поэтому границы слов — руками. */
export function matchTopic(text: string): Topic {
  for (const [topic, re] of TOPIC_WORDS) if (re.test(text)) return topic;
  return 'default';
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function between(rng: () => number, [min, max]: [number, number]): number {
  return min + Math.floor(rng() * (max - min));
}

export function npcAuthor(voice: NpcVoice): ChatAuthor {
  return { id: `npc:${voice.id}`, name: voice.name };
}

/**
 * Кто ответит на слова игрока и что. Отвечают те, у кого есть реплика по теме; если тема никому
 * не знакома — любой, своей дежурной фразой. Иногда (в общем канале) отвечают двое.
 * В гильдейском канале вызывающий передаёт голоса только членов гильдии.
 */
export function npcReplies(text: string, channel: ChannelId, rng: () => number, now = Date.now(), voices = NPC_VOICES): PendingReply[] {
  const topic = matchTopic(text);
  const knowing = voices.filter((v) => (v.replies[topic]?.length ?? 0) > 0);
  const pool = knowing.length > 0 ? knowing : voices.filter((v) => (v.replies.default?.length ?? 0) > 0);
  if (pool.length === 0) return [];
  const first = pick(rng, pool);
  const out: PendingReply[] = [
    { at: now + between(rng, REPLY_DELAY_MS), channel, author: npcAuthor(first), text: pick(rng, first.replies[topic] ?? first.replies.default ?? ['…']) },
  ];
  if (channel === 'tavern' && pool.length > 1 && rng() < 0.35) {
    const second = pick(
      rng,
      pool.filter((v) => v.id !== first.id),
    );
    out.push({ at: out[0].at + between(rng, [2_000, 6_000]), channel, author: npcAuthor(second), text: pick(rng, second.replies[topic] ?? second.replies.default ?? ['…']) });
  }
  return out;
}

/** Реплика без повода: кто-то из завсегдатаев вставляет слово. */
export function ambientLine(rng: () => number, now = Date.now(), voices = NPC_VOICES): PendingReply {
  const voice = pick(rng, voices.filter((v) => v.ambient.length > 0));
  return { at: now, channel: 'tavern', author: npcAuthor(voice), text: pick(rng, voice.ambient) };
}

export function nextAmbientAt(rng: () => number, now = Date.now()): number {
  return now + between(rng, AMBIENT_EVERY_MS);
}

/** Сводка боя для канала «Арена». */
export function fightNews(player: string, opponent: string, status: FightStatus, turns: number, venue: 'city' | 'brod' | 'tournament' | 'wild'): string {
  const where = venue === 'brod' ? 'Брод' : venue === 'tournament' ? 'Замок' : venue === 'wild' ? 'Дорога' : 'Арена';
  if (status === 'won') return `${where}: ${player} уложил ${opponent} за ${turns} ход.`.replace('ход.', turns === 1 ? 'ход.' : turns < 5 ? 'хода.' : 'ходов.');
  if (status === 'lost') return `${where}: ${opponent} уложил ${player}. ${turns} ход${turns === 1 ? '' : turns < 5 ? 'а' : 'ов'}.`;
  return `${where}: ${player} и ${opponent} разошлись вничью.`;
}

/** Реплика завсегдатая на сводку боя — подначка или уважение. */
export function fightRemark(player: string, status: FightStatus, rng: () => number): string {
  const won = ['Ну, бывает. Даже у новичков.', 'Видел. Ничего так.', 'Записал в летопись. Мелким шрифтом.', 'Уважение. Пока.'];
  const lost = ['Больно смотреть было.', 'Лекарь через дорогу.', 'Стойка — дрянь. Исправим.', 'Ставки принимались. Я выиграл.'];
  const draw = ['Вничью. Скучно.', 'Двое устали. Зал зевал.'];
  return `${player}? ${pick(rng, status === 'won' ? won : status === 'lost' ? lost : draw)}`;
}

/** Доставить созревшие ответы в ленту. */
export function deliverPending(state: ChatState, now: number, makeId: () => string): ChatState {
  const due = state.pending.filter((p) => p.at <= now);
  if (due.length === 0) return state;
  let next: ChatState = { ...state, pending: state.pending.filter((p) => p.at > now) };
  for (const p of due) {
    next = appendMessage(next, { id: makeId(), channel: p.channel, at: p.at, author: p.author, text: p.text, kind: 'npc' });
  }
  return next;
}

export function isMuted(state: ChatState, authorId: string): boolean {
  return state.muted.includes(authorId);
}
