import type { Character, Ledger } from './types';
import { SLOTS } from './types';
import { RIVALS } from './rivals';

// Счётчики за всю игру (ledger) и достижения с наградой.

export function emptyLedger(): Ledger {
  return {
    fightsTotal: 0,
    damageDealt: 0,
    damageTaken: 0,
    crits: 0,
    streak: 0,
    bestStreak: 0,
    mineEarned: 0,
    kreditsEarned: 0,
    kreditsSpent: 0,
    itemsBought: 0,
    tournamentsWon: 0,
  };
}

export function normalizeLedger(raw?: Partial<Ledger> | null): Ledger {
  return { ...emptyLedger(), ...(raw ?? {}) };
}

/** Серия побед: победа продолжает, остальное обрывает. */
export function ledgerAfterFight(l: Ledger, won: boolean): Ledger {
  const streak = won ? l.streak + 1 : 0;
  return { ...l, fightsTotal: l.fightsTotal + 1, streak, bestStreak: Math.max(l.bestStreak, streak) };
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  reward: number;
  check: (c: Character) => boolean;
  /** Текущий прогресс для полоски: [есть, нужно]. */
  progress?: (c: Character) => [number, number];
}

/** Порог по числу: проверка и полоска прогресса одной строкой. */
function atLeast(get: (c: Character) => number, need: number): Pick<AchievementDef, 'check' | 'progress'> {
  return { check: (c) => get(c) >= need, progress: (c) => [Math.min(get(c), need), need] };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Победы и бои
  { id: 'first-blood', name: 'Первая кровь', description: 'Выиграй первый бой', reward: 10, ...atLeast((c) => c.wins, 1) },
  { id: 'ten-wins', name: 'Десятка', description: '10 побед', reward: 30, ...atLeast((c) => c.wins, 10) },
  { id: 'fifty-wins', name: 'Полтинник', description: '50 побед', reward: 120, ...atLeast((c) => c.wins, 50) },
  { id: 'hundred-wins', name: 'Сотник', description: '100 побед', reward: 250, ...atLeast((c) => c.wins, 100) },
  { id: 'hundred-fights', name: 'Своя скамейка', description: '100 боёв, любых', reward: 80, ...atLeast((c) => c.ledger.fightsTotal, 100) },
  { id: 'streak-5', name: 'Серия', description: '5 побед подряд', reward: 40, ...atLeast((c) => c.ledger.bestStreak, 5) },
  { id: 'streak-10', name: 'Непобитый', description: '10 побед подряд', reward: 100, ...atLeast((c) => c.ledger.bestStreak, 10) },
  { id: 'beaten-10', name: 'Битый', description: '10 поражений. Говорят, за одного битого двух небитых дают', reward: 15, ...atLeast((c) => c.losses, 10) },
  // Урон
  { id: 'crit-50', name: 'Критовик', description: '50 критических ударов', reward: 30, ...atLeast((c) => c.ledger.crits, 50) },
  { id: 'damage-1000', name: 'Костолом', description: 'Нанеси 1000 урона', reward: 30, ...atLeast((c) => c.ledger.damageDealt, 1000) },
  { id: 'damage-5000', name: 'Мясорубка', description: 'Нанеси 5000 урона', reward: 100, ...atLeast((c) => c.ledger.damageDealt, 5000) },
  { id: 'survivor', name: 'Живучий', description: 'Переживи 1000 урона', reward: 30, ...atLeast((c) => c.ledger.damageTaken, 1000) },
  // Уровни и рейтинг
  { id: 'level-3', name: 'Третий круг', description: 'Достигни 3 уровня: открываются перевал и Брод', reward: 30, ...atLeast((c) => c.level, 3) },
  { id: 'level-5', name: 'Пятый круг', description: 'Достигни 5 уровня', reward: 60, ...atLeast((c) => c.level, 5) },
  { id: 'veteran', name: 'Ветеран', description: 'Рейтинг 150', reward: 60, ...atLeast((c) => c.rating, 150) },
  { id: 'wall-name', name: 'Имя на стене', description: 'Рейтинг 800: Гришка пишет тебя на стене зала', reward: 300, ...atLeast((c) => c.rating, 800) },
  { id: 'learned', name: 'Учёный', description: 'Возьми 3 умения', reward: 40, ...atLeast((c) => c.perks.length, 3) },
  // Турнир и соперники
  { id: 'champion', name: 'Чемпион', description: 'Выиграй турнир князя', reward: 100, ...atLeast((c) => c.ledger.tournamentsWon, 1) },
  { id: 'champion-3', name: 'Трижды чемпион', description: '3 турнира князя', reward: 200, ...atLeast((c) => c.ledger.tournamentsWon, 3) },
  {
    id: 'old-scores',
    name: 'Старые счёты',
    description: 'Побей одного именного соперника 5 раз',
    reward: 50,
    check: (c) => Object.values(c.rivals).some((r) => r.wins >= 5),
    progress: (c) => [Math.min(Math.max(0, ...Object.values(c.rivals).map((r) => r.wins)), 5), 5],
  },
  {
    id: 'all-faces',
    name: 'Все лица арены',
    description: 'Побей каждого именного соперника хотя бы раз',
    reward: 80,
    check: (c) => RIVALS.every((r) => (c.rivals[r.id]?.wins ?? 0) >= 1),
    progress: (c) => [RIVALS.filter((r) => (c.rivals[r.id]?.wins ?? 0) >= 1).length, RIVALS.length],
  },
  {
    id: 'nemesis',
    name: 'Должник',
    description: 'Проиграй одному именному сопернику 5 раз. Он тебя запомнил',
    reward: 20,
    check: (c) => Object.values(c.rivals).some((r) => r.losses >= 5),
    progress: (c) => [Math.min(Math.max(0, ...Object.values(c.rivals).map((r) => r.losses)), 5), 5],
  },
  // Деньги и вещи
  { id: 'miner-100', name: 'Шахтёр', description: 'Заработай 100 кр. в шахте', reward: 25, ...atLeast((c) => c.ledger.mineEarned, 100) },
  { id: 'miner-1000', name: 'Старшина штольни', description: 'Заработай 1000 кр. в шахте', reward: 80, ...atLeast((c) => c.ledger.mineEarned, 1000) },
  { id: 'first-thousand', name: 'Первая тысяча', description: 'Заработай 1000 кр. всего', reward: 50, ...atLeast((c) => c.ledger.kreditsEarned, 1000) },
  { id: 'purse', name: 'Мошна', description: 'Заработай 10000 кр. всего', reward: 200, ...atLeast((c) => c.ledger.kreditsEarned, 10000) },
  { id: 'customer', name: 'Постоянный клиент', description: 'Купи 10 вещей в лавке', reward: 30, ...atLeast((c) => c.ledger.itemsBought, 10) },
  {
    id: 'full-set',
    name: 'Полный комплект',
    description: 'Надень вещи во все слоты, кольца и амулет тоже',
    reward: 40,
    check: (c) => SLOTS.every((s) => !!c.equipment[s]),
    progress: (c) => [SLOTS.filter((s) => !!c.equipment[s]).length, SLOTS.length],
  },
  { id: 'sharp-3', name: 'Остриё', description: 'Заточи вещь до +3', reward: 40, check: (c) => c.backpack.some((i) => i.upgrade >= 3) },
  // Дикие земли
  { id: 'relic-hunter', name: 'Кладоискатель', description: 'Принеси из руин 5 реликвий разом', reward: 40, ...atLeast((c) => c.resources.relics, 5) },
  // Склеп и рейды
  { id: 'bone-sack', name: 'Костяной мешок', description: 'Вынеси из склепа 30 костей разом', reward: 40, ...atLeast((c) => c.resources.bones, 30) },
  { id: 'raider', name: 'Налётчик', description: 'Пройди склеп до дна и уложи троих в чужой столице за один рейд', reward: 120, check: (c) => c.titles.includes('Налётчик') },
  { id: 'gatekeeper', name: 'Привратник', description: 'Отбей ответный рейд чужих у своих ворот', reward: 60, check: (c) => c.titles.includes('Привратник') },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, AchievementDef>;

/** Выполненные, но ещё не забранные. */
export function claimableAchievements(c: Character): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !c.achievements.includes(a.id) && a.check(c));
}
