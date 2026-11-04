import type { QuestEvent } from './quests';
import { dayKey } from './quests';
import { daysBetween, shiftDay } from './events';
import type { ChestKind, ChestLoot } from './chests';
import { itemNear } from './chests';

// Удержание: награда за вход семь дней подряд, три цели на неделю с сундуками,
// бонус к награде за серию побед (считается по `ledger.streak`).

// ─── Награда за вход ─────────────────────────────────────────────────────────

export const DAILY_DAYS = 7;

export interface DailyGiftDef {
  day: number;
  title: string;
  /** Короткая подпись в клетке календаря. */
  short: string;
  roll: (level: number, rng: () => number) => ChestLoot[];
}

export const DAILY_CHAIN: DailyGiftDef[] = [
  { day: 1, title: 'Кредиты на пиво', short: 'кр.', roll: (level) => [{ kind: 'kredits', amount: 20 + 10 * level }] },
  { day: 2, title: 'Пучок трав', short: 'травы', roll: () => [{ kind: 'resource', resource: 'herbs', amount: 5 }] },
  { day: 3, title: 'Зелье лекаря', short: 'зелье', roll: () => [{ kind: 'heal' }] },
  { day: 4, title: 'Кошель потяжелее', short: 'кр.', roll: (level) => [{ kind: 'kredits', amount: 40 + 20 * level }] },
  { day: 5, title: 'Дрова и руда', short: 'дрова', roll: () => [{ kind: 'resource', resource: 'wood', amount: 6 }, { kind: 'resource', resource: 'ore', amount: 3 }] },
  { day: 6, title: 'Вещь с чужого плеча', short: 'вещь', roll: (level, rng) => [{ kind: 'item', itemId: itemNear(level, rng).id, upgrade: 0 }] },
  { day: 7, title: 'Окованный сундук', short: 'сундук', roll: () => [{ kind: 'chest', chest: 'bound' }] },
];

export interface DailyState {
  /** День последней забранной награды (YYYY-MM-DD) или null. */
  lastClaimDay: string | null;
  /** Сколько дней подряд забрано, 1..7; 0 — ещё ничего. */
  streak: number;
  /** Недельные цели. */
  weekly: WeeklyBoard | null;
}

export function newDaily(): DailyState {
  return { lastClaimDay: null, streak: 0, weekly: null };
}

export function normalizeDaily(raw?: Partial<DailyState> | null): DailyState {
  return {
    lastClaimDay: raw?.lastClaimDay ?? null,
    streak: typeof raw?.streak === 'number' ? Math.max(0, Math.min(DAILY_DAYS, raw.streak)) : 0,
    weekly: raw?.weekly ?? null,
  };
}

/** Сегодня уже забрано? */
export function dailyClaimed(d: DailyState, today = dayKey()): boolean {
  return d.lastClaimDay === today;
}

/**
 * Какой день цепочки даст сегодняшняя награда.
 * Правило пропусков: один пропущенный день откатывает на день назад (вчерашнюю награду получишь заново),
 * два и больше — цепочка сгорает, снова с первого. Мягко к тем, кто забыл раз, и строго к тем, кто ушёл:
 * иначе седьмой сундук ничего не стоит. После седьмого дня цепочка начинается заново.
 */
export function nextDailyDay(d: DailyState, today = dayKey()): number {
  if (!d.lastClaimDay || d.streak <= 0) return 1;
  const gap = daysBetween(d.lastClaimDay, today);
  if (gap <= 0) return Math.min(DAILY_DAYS, Math.max(1, d.streak)); // уже забрано: показываем текущий
  if (gap === 1) return d.streak >= DAILY_DAYS ? 1 : d.streak + 1;
  if (gap === 2) return Math.max(1, Math.min(DAILY_DAYS - 1, d.streak));
  return 1;
}

export function dailyGift(day: number): DailyGiftDef {
  return DAILY_CHAIN[Math.max(1, Math.min(DAILY_DAYS, day)) - 1];
}

/** Забрать награду: новое состояние и выданное. Если сегодня уже забрано — null. */
export function claimDailyState(d: DailyState, level: number, rng: () => number, today = dayKey()): { state: DailyState; day: number; loot: ChestLoot[] } | null {
  if (dailyClaimed(d, today)) return null;
  const day = nextDailyDay(d, today);
  return { state: { ...d, lastClaimDay: today, streak: day }, day, loot: dailyGift(day).roll(level, rng) };
}

/** Для мастера игры: «новый день» сдвигает отметку на день назад, чтобы награду можно было забрать снова. */
export function dailyRewind(d: DailyState): DailyState {
  return d.lastClaimDay ? { ...d, lastClaimDay: shiftDay(d.lastClaimDay, -1) } : d;
}

// ─── Серия побед ────────────────────────────────────────────────────────────

/** Пороги серии и множитель кредитов за победу. */
export const STREAK_STEPS: { wins: number; mult: number }[] = [
  { wins: 3, mult: 1.1 },
  { wins: 5, mult: 1.2 },
  { wins: 10, mult: 1.3 },
];

/** Множитель награды за `streak` побед подряд (считая текущую). */
export function streakBonusMult(streak: number): number {
  let mult = 1;
  for (const s of STREAK_STEPS) if (streak >= s.wins) mult = s.mult;
  return mult;
}

/** Серия только что достигла порога — повод для строки в лог. */
export function streakStepReached(streak: number): number | null {
  return STREAK_STEPS.some((s) => s.wins === streak) ? streak : null;
}

// ─── Недельные цели ─────────────────────────────────────────────────────────

export type WeeklyEvent = QuestEvent | 'skirmish';

export interface WeeklyTemplate {
  id: string;
  event: WeeklyEvent;
  title: (target: number) => string;
  targets: number[];
  chest: ChestKind;
}

export interface WeeklyGoal {
  id: string;
  templateId: string;
  event: WeeklyEvent;
  target: number;
  progress: number;
  claimed: boolean;
}

export interface WeeklyBoard {
  /** Понедельник недели (YYYY-MM-DD). */
  week: string;
  goals: WeeklyGoal[];
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

const fights = (n: number) => plural(n, 'бой', 'боя', 'боёв');
const wins = (n: number) => plural(n, 'победа', 'победы', 'побед');
const skirm = (n: number) => plural(n, 'стычка', 'стычки', 'стычек');
const things = (n: number) => plural(n, 'вещь', 'вещи', 'вещей');
const hours = (n: number) => plural(n, 'час', 'часа', 'часов');

/** Цели от писаря Гришки: он ведёт летопись и считает за неделю. Первая — всегда бои, на неё завязаны тесты. */
export const WEEKLY_TEMPLATES: WeeklyTemplate[] = [
  { id: 'fights', event: 'fightPlay', title: (n) => `${n} ${fights(n)} за неделю. Гришка пишет всех, кто выходил`, targets: [15, 20], chest: 'wooden' },
  { id: 'fights-many', event: 'fightPlay', title: (n) => `${n} ${fights(n)}: своя скамейка в подвале`, targets: [35], chest: 'bound' },
  { id: 'wins', event: 'fightWin', title: (n) => `${n} ${wins(n)} за неделю. Чёрными чернилами`, targets: [10, 12], chest: 'wooden' },
  { id: 'wins-many', event: 'fightWin', title: (n) => `${n} ${wins(n)}. Хозяин обещал посмотреть лично`, targets: [25], chest: 'princely' },
  { id: 'stronger', event: 'fightWinStronger', title: (n) => `${n} побитых выше уровнем. Такое Гришка подчёркивает`, targets: [3, 5], chest: 'bound' },
  { id: 'skirmish', event: 'skirmish', title: (n) => `${n} ${skirm(n)} с чужими гильдиями. Чтобы знали`, targets: [5, 8], chest: 'bound' },
  { id: 'sell', event: 'sellResources', title: (n) => `Продай ${n} шт. в лавку или на рынок. Город ждёт товара`, targets: [40, 60], chest: 'wooden' },
  { id: 'repair', event: 'repair', title: (n) => `${n} ${plural(n, 'раз', 'раза', 'раз')} к Макару за починкой. Он запомнит`, targets: [5, 8], chest: 'wooden' },
  { id: 'sharpen', event: 'sharpen', title: (n) => `${n} ${plural(n, 'заточка', 'заточки', 'заточек')} за неделю. Железо любит точильный камень`, targets: [3], chest: 'bound' },
  { id: 'mine', event: 'mineHours', title: (n) => `${n} ${hours(n)} в шахте. Старшина отметит в табеле`, targets: [10, 16], chest: 'wooden' },
  { id: 'buy', event: 'buyItem', title: (n) => `${n} ${things(n)} из лавки. Ломбардщик ставит свечку за тебя`, targets: [3], chest: 'wooden' },
  { id: 'gather', event: 'gather', title: (n) => `${n} шт. из диких земель. Лес, болото, перевал — всё в зачёт`, targets: [60, 100], chest: 'bound' },
  { id: 'heal', event: 'heal', title: (n) => `${n} ${plural(n, 'зелье', 'зелья', 'зелий')} у лекаря. Он тоже есть хочет`, targets: [6], chest: 'wooden' },
];

/** Понедельник недели, в которую попадает момент `now` (локальная дата). */
export function weekKey(now = Date.now()): string {
  const d = new Date(now);
  const dow = (d.getDay() + 6) % 7; // понедельник = 0
  return shiftDay(dayKey(now), -dow);
}

/** Три цели на неделю, по разным событиям. */
export function generateWeekly(rng: () => number, now = Date.now()): WeeklyBoard {
  let pool = [...WEEKLY_TEMPLATES];
  const goals: WeeklyGoal[] = [];
  while (goals.length < 3 && pool.length > 0) {
    const t = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    pool = pool.filter((x) => x.event !== t.event);
    const target = t.targets[Math.floor(rng() * t.targets.length)];
    goals.push({ id: `${t.id}-${target}`, templateId: t.id, event: t.event, target, progress: 0, claimed: false });
  }
  return { week: weekKey(now), goals };
}

export function weeklyTitle(g: WeeklyGoal): string {
  return WEEKLY_TEMPLATES.find((t) => t.id === g.templateId)?.title(g.target) ?? g.templateId;
}

export function weeklyChest(g: WeeklyGoal): ChestKind {
  return WEEKLY_TEMPLATES.find((t) => t.id === g.templateId)?.chest ?? 'wooden';
}

export function weeklyDone(g: WeeklyGoal): boolean {
  return g.progress >= g.target;
}

/** Прогресс по событию; доска чужой недели не меняется. */
export function applyWeeklyEvent(board: WeeklyBoard, event: WeeklyEvent, amount = 1, now = Date.now()): WeeklyBoard {
  if (board.week !== weekKey(now) || amount <= 0) return board;
  let changed = false;
  const goals = board.goals.map((g) => {
    if (g.event !== event || g.claimed || weeklyDone(g)) return g;
    changed = true;
    return { ...g, progress: Math.min(g.target, g.progress + amount) };
  });
  return changed ? { ...board, goals } : board;
}

/** Дней до конца недели, считая сегодняшний. */
export function weekDaysLeft(now = Date.now()): number {
  return 7 - daysBetween(weekKey(now), dayKey(now));
}
