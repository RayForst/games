// Пивная: три ежедневных задания и слухи. Прогресс копится из событий стора (бой, шахта, покупка…).

export type QuestEvent = 'fightWin' | 'fightPlay' | 'fightWinStronger' | 'mineHours' | 'buyItem' | 'repair' | 'heal' | 'sharpen';

export interface QuestTemplate {
  id: string;
  event: QuestEvent;
  /** Заголовок с подстановкой цели. */
  title: (target: number) => string;
  /** Варианты цели; выбирается случайно. */
  targets: number[];
  /** Награда в кредитах за единицу цели, опыт считается от неё. */
  kreditsPer: number;
}

export interface QuestState {
  id: string;
  templateId: string;
  event: QuestEvent;
  target: number;
  progress: number;
  claimed: boolean;
}

export interface QuestBoard {
  /** Локальная дата YYYY-MM-DD. На следующий день доска пересоздаётся. */
  day: string;
  quests: QuestState[];
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { id: 'win', event: 'fightWin', title: (n) => `Победи ${n} ${n === 1 ? 'раз' : n < 5 ? 'раза' : 'раз'}`, targets: [2, 3, 4], kreditsPer: 8 },
  { id: 'play', event: 'fightPlay', title: (n) => `Проведи ${n} ${n < 5 ? 'боя' : 'боёв'}`, targets: [3, 5], kreditsPer: 5 },
  { id: 'stronger', event: 'fightWinStronger', title: () => 'Побей соперника выше уровнем', targets: [1], kreditsPer: 30 },
  { id: 'mine', event: 'mineHours', title: (n) => `Отработай ${n} ${n === 1 ? 'час' : n < 5 ? 'часа' : 'часов'} в шахте`, targets: [1, 4], kreditsPer: 6 },
  { id: 'buy', event: 'buyItem', title: () => 'Купи вещь в лавке', targets: [1], kreditsPer: 12 },
  { id: 'repair', event: 'repair', title: () => 'Почини вещь у Макара', targets: [1], kreditsPer: 10 },
  { id: 'heal', event: 'heal', title: () => 'Выпей зелье у лекаря', targets: [1], kreditsPer: 8 },
  { id: 'sharpen', event: 'sharpen', title: () => 'Заточи вещь в кузнице', targets: [1], kreditsPer: 15 },
];

/** Локальная дата как ключ дня. */
export function dayKey(now = Date.now()): string {
  const d = new Date(now);
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Три разных задания на день. */
export function generateBoard(rng: () => number, now = Date.now()): QuestBoard {
  const pool = [...QUEST_TEMPLATES];
  const quests: QuestState[] = [];
  while (quests.length < 3 && pool.length > 0) {
    const t = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const target = t.targets[Math.floor(rng() * t.targets.length)];
    quests.push({ id: `${t.id}-${target}`, templateId: t.id, event: t.event, target, progress: 0, claimed: false });
  }
  return { day: dayKey(now), quests };
}

export function questTitle(q: QuestState): string {
  return QUEST_TEMPLATES.find((t) => t.id === q.templateId)?.title(q.target) ?? q.templateId;
}

/** Награда растёт с уровнем игрока. */
export function questReward(q: QuestState, level: number): { kredits: number; exp: number } {
  const per = QUEST_TEMPLATES.find((t) => t.id === q.templateId)?.kreditsPer ?? 5;
  const kredits = Math.round(per * q.target * (1 + level * 0.4));
  return { kredits, exp: Math.round(kredits * 0.8) };
}

export function questDone(q: QuestState): boolean {
  return q.progress >= q.target;
}

/** Прогресс по событию. Доска чужого дня не меняется. */
export function applyQuestEvent(board: QuestBoard, event: QuestEvent, amount = 1, now = Date.now()): QuestBoard {
  if (board.day !== dayKey(now) || amount <= 0) return board;
  let changed = false;
  const quests = board.quests.map((q) => {
    if (q.event !== event || q.claimed || questDone(q)) return q;
    changed = true;
    return { ...q, progress: Math.min(q.target, q.progress + amount) };
  });
  return changed ? { ...board, quests } : board;
}

export const RUMORS = [
  'Блок закрывает две соседние зоны. Крит иногда пробивает и его.',
  'Ловкость — это уворот и защита от крита. Интуиция — крит и пробитие уворота.',
  'Сломанная вещь не даёт ничего. Макар чинит за четверть цены.',
  'Заточка +3 — это +3 к урону. На ноже смешно, на топоре страшно.',
  'Лекарь берёт за малое зелье копейки. Не дерись с двумя hp.',
  'В шахте платят за силу и выносливость. Слабые туда не ходят.',
  'Травма проходит сама, но час с −2 к ловкости — это час поражений.',
  'Боты запоминают, куда ты бьёшь. Меняй зону.',
  'Соперник выше уровнем даёт больше опыта и кредитов. И травм.',
  'Умения дают на чётных уровнях. Грамотей ускоряет всё остальное.',
  'Хозяин клуба платит за победы, а не за красивые глаза.',
  'Говорят, князь устроит турнир. Кто выстоит четыре боя подряд, тот и чемпион.',
];

/** Три слуха на день: одинаковые в течение дня, разные в разные дни. */
export function dailyRumors(day: string, count = 3): string[] {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const out: string[] = [];
  const pool = [...RUMORS];
  while (out.length < count && pool.length > 0) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  return out;
}
