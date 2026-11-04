import type { GiName } from '@/ui/gi.generated';

import type { AchievementDef } from './achievements';
import type { Character } from './types';

// Косметика и Лавка князя: рамки портрета, цвет имени в чате, покупные прозвища, эмблемы, фон карточки.
// Валюта — «печати князя» (`Character.seals`): за достижения, за турнир, за неделю входа подряд и обмен кредитов.
// Ничего из этого не влияет на бой — только витрина. Заготовка под монетизацию без платежей.

export type CosmeticKind = 'frame' | 'nameColor' | 'title' | 'emblem' | 'cardBg';

export const COSMETIC_KINDS: CosmeticKind[] = ['frame', 'nameColor', 'title', 'emblem', 'cardBg'];

export const COSMETIC_KIND_LABELS: Record<CosmeticKind, string> = {
  frame: 'Рамки',
  nameColor: 'Цвет имени',
  title: 'Прозвища',
  emblem: 'Эмблемы',
  cardBg: 'Фон карточки',
};

export const COSMETIC_KIND_ICONS: Record<CosmeticKind, GiName> = {
  frame: 'frame',
  nameColor: 'paint',
  title: 'quill',
  emblem: 'banner',
  cardBg: 'curtain',
};

/** Как рисовать рамку: одна линия, двойная или с уголками. */
export type FrameStyle = 'plain' | 'double' | 'ornate';

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  name: string;
  /** Короткая строка лавочника — тон «быдло в кольчугах». */
  description: string;
  /** Цена в печатях князя. */
  price: number;
  /** Основной цвет: линия рамки, цвет имени, фон карточки. */
  color?: string;
  /** Второй цвет: внутренняя линия рамки или уголки. */
  accent?: string;
  /** Рамка: как рисуем. */
  frameStyle?: FrameStyle;
  /** Эмблема: иконка из Game Icons. */
  icon?: GiName;
}

export const COSMETICS: CosmeticDef[] = [
  // Рамки портрета
  { id: 'frame-wood', kind: 'frame', name: 'Дерево', description: 'Дубовая, из старой лавки. Пахнет пивом', price: 6, color: '#7a4f2a', accent: '#4a2f18', frameStyle: 'plain' },
  { id: 'frame-iron', kind: 'frame', name: 'Чернёное железо', description: 'Кованая. Ржавчину сбили, не всю', price: 10, color: '#6b6d72', accent: '#2b2c30', frameStyle: 'double' },
  { id: 'frame-brass', kind: 'frame', name: 'Латунь', description: 'Начищена до блеска подмастерьем за подзатыльник', price: 14, color: '#c89b4a', accent: '#6e5020', frameStyle: 'double' },
  { id: 'frame-blood', kind: 'frame', name: 'Кровь', description: 'Красят, говорят, не краской. Врут, наверно', price: 16, color: '#b8372c', accent: '#5a1711', frameStyle: 'plain' },
  { id: 'frame-bone', kind: 'frame', name: 'Кость', description: 'Из чьих — лавочник не уточняет', price: 18, color: '#e4d8bd', accent: '#8f8468', frameStyle: 'ornate' },
  { id: 'frame-silver', kind: 'frame', name: 'Серебро', description: 'Настоящее. Проверяли зубом', price: 24, color: '#cfd6dd', accent: '#6e7c8a', frameStyle: 'double' },
  { id: 'frame-prince', kind: 'frame', name: 'Княжеская', description: 'Золото по синему. Князь такое вешает над своим столом', price: 36, color: '#d9a74a', accent: '#5b8fc9', frameStyle: 'ornate' },
  { id: 'frame-dragon', kind: 'frame', name: 'Драконья', description: 'Чешуя с перевала, гуляет багровым. Редкая дрянь', price: 48, color: '#7d2a3c', accent: '#d9a74a', frameStyle: 'ornate' },
  // Цвет имени в чате
  { id: 'name-gold', kind: 'nameColor', name: 'Золотое', description: 'Чтоб за столом видели, кто тут при деньгах', price: 8, color: '#d9a74a' },
  { id: 'name-blood', kind: 'nameColor', name: 'Кровавое', description: 'Имя, которое пишут на стене после драки', price: 8, color: '#e0564a' },
  { id: 'name-moss', kind: 'nameColor', name: 'Болотное', description: 'Зелень трясины. Болотник одобряет', price: 8, color: '#7fbf63' },
  { id: 'name-sky', kind: 'nameColor', name: 'Княжеский синий', description: 'Цвет стражи и указов', price: 10, color: '#6fa3e0' },
  { id: 'name-violet', kind: 'nameColor', name: 'Чернильное', description: 'Как у писаря, только тот платил кровью', price: 10, color: '#b58be8' },
  // Покупные прозвища (не путать с титулами турнира)
  { id: 'title-brod', kind: 'title', name: 'Гроза Брода', description: 'За перевалом тебя ещё не знают, но прозвище уже есть', price: 12 },
  { id: 'title-tavern', kind: 'title', name: 'Кабацкий философ', description: 'Пять кружек — пять истин', price: 12 },
  { id: 'title-porch', kind: 'title', name: 'Костолом с паперти', description: 'Начинал у церкви, кончил на арене', price: 14 },
  { id: 'title-wolf', kind: 'title', name: 'Старый волк', description: 'Седины нет, но характер уже да', price: 16 },
  { id: 'title-pass', kind: 'title', name: 'Хозяин перевала', description: 'Хозяев у перевала трое, и все спорят', price: 20 },
  { id: 'title-favorite', kind: 'title', name: 'Любимец князя', description: 'Князь про тебя не слышал. Но лавочник не скажет', price: 28 },
  // Эмблемы для чата и профиля
  { id: 'emblem-wolf', kind: 'emblem', name: 'Волк', description: 'Серый, голодный, свой', price: 10, icon: 'wolf' },
  { id: 'emblem-boar', kind: 'emblem', name: 'Вепрь', description: 'Прёт напролом, как и ты', price: 10, icon: 'boar' },
  { id: 'emblem-raven', kind: 'emblem', name: 'Ворон', description: 'Ждёт, когда ты упадёшь. Не дождётся', price: 10, icon: 'raven' },
  { id: 'emblem-skull', kind: 'emblem', name: 'Череп', description: 'Классика. Все остальные уже с черепами', price: 12, icon: 'skull' },
  { id: 'emblem-bear', kind: 'emblem', name: 'Медведь', description: 'Из северных лесов, где и пиво гуще', price: 14, icon: 'bear' },
  { id: 'emblem-rose', kind: 'emblem', name: 'Роза', description: 'С шипами. Как и всё здесь', price: 14, icon: 'rose' },
  { id: 'emblem-lion', kind: 'emblem', name: 'Лев', description: 'Герб тех, у кого есть герб', price: 18, icon: 'lion' },
  { id: 'emblem-dragon', kind: 'emblem', name: 'Дракон', description: 'Никто не видел, но все боятся', price: 24, icon: 'dragon' },
  // Фон карточки бойца
  { id: 'bg-oak', kind: 'cardBg', name: 'Морёный дуб', description: 'Тёмное дерево, как стойка в пивной', price: 12, color: '#2a1d12', accent: '#4a2f18' },
  { id: 'bg-stone', kind: 'cardBg', name: 'Сырой камень', description: 'Как в подвале замка. Холодит', price: 14, color: '#232426', accent: '#44474c' },
  { id: 'bg-velvet', kind: 'cardBg', name: 'Бархат', description: 'Багровый, вытертый. Снят с чьего-то трона', price: 20, color: '#2e1216', accent: '#6e2a24' },
  { id: 'bg-night', kind: 'cardBg', name: 'Ночь', description: 'Синь перед грозой. Князь в такую не выходит', price: 20, color: '#121a2a', accent: '#2d4a73' },
];

export const COSMETICS_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c])) as Record<string, CosmeticDef>;

export function cosmeticsOf(kind: CosmeticKind): CosmeticDef[] {
  return COSMETICS.filter((c) => c.kind === kind);
}

// --- Печати князя ---

/** Печатей за выигранный турнир. */
export const SEALS_FOR_TOURNAMENT = 5;
/** Печатей за 7-й день входа подряд (ежедневки зовут `grantSeals(SEALS_FOR_WEEK_STREAK)`). */
export const SEALS_FOR_WEEK_STREAK = 10;
/** Курс обмена в лавке: кредитов за одну печать. Дорого — печати должны зарабатываться. */
export const KREDITS_PER_SEAL = 200;
/** Пачки обмена: за 5 печатей чуть дешевле. */
export const SEAL_PACKS: { seals: number; kredits: number }[] = [
  { seals: 1, kredits: KREDITS_PER_SEAL },
  { seals: 5, kredits: KREDITS_PER_SEAL * 5 - 100 },
];

/** Печатей за достижение: явное поле или от кредитной награды (10 кр. → 1, 100 кр. → 3, 300 кр. → 6). */
export function sealsForAchievement(a: Pick<AchievementDef, 'reward' | 'seals'>): number {
  if (typeof a.seals === 'number') return Math.max(0, Math.round(a.seals));
  return Math.max(1, Math.round(Math.sqrt(a.reward / 10)));
}

export function sealPackPrice(seals: number): number {
  const pack = SEAL_PACKS.find((p) => p.seals === seals);
  return pack ? pack.kredits : seals * KREDITS_PER_SEAL;
}

// --- Владение ---

export interface Cosmetics {
  owned: string[];
  equipped: Partial<Record<CosmeticKind, string>>;
}

export function emptyCosmetics(): Cosmetics {
  return { owned: [], equipped: {} };
}

/** Старый сейв или сейв с вещами, которых больше нет в каталоге: лишнее выбрасываем. */
export function normalizeCosmetics(raw?: Partial<Cosmetics> | null): Cosmetics {
  const owned = Array.isArray(raw?.owned) ? Array.from(new Set(raw.owned.filter((id) => typeof id === 'string' && !!COSMETICS_BY_ID[id]))) : [];
  const equipped: Cosmetics['equipped'] = {};
  for (const kind of COSMETIC_KINDS) {
    const id = raw?.equipped?.[kind];
    if (id && owned.includes(id) && COSMETICS_BY_ID[id]?.kind === kind) equipped[kind] = id;
  }
  return { owned, equipped };
}

export function ownsCosmetic(c: Character, id: string): boolean {
  return c.cosmetics.owned.includes(id);
}

/** Что надето в этом разделе, или null. */
export function equippedCosmetic(c: Character, kind: CosmeticKind): CosmeticDef | null {
  const id = c.cosmetics.equipped[kind];
  return id ? (COSMETICS_BY_ID[id] ?? null) : null;
}

export function canBuyCosmetic(c: Character, id: string): { ok: boolean; reason?: string } {
  const def = COSMETICS_BY_ID[id];
  if (!def) return { ok: false, reason: 'Такого в лавке нет' };
  if (ownsCosmetic(c, id)) return { ok: false, reason: 'Уже твоё' };
  if (c.seals < def.price) return { ok: false, reason: `Нужно ${def.price} печатей, у тебя ${c.seals}` };
  return { ok: true };
}

/** Покупка: списывает печати, вещь сразу надевается — купил, значит хочешь носить. */
export function buyCosmetic(c: Character, id: string): Character {
  const def = COSMETICS_BY_ID[id];
  if (!def || !canBuyCosmetic(c, id).ok) return c;
  return {
    ...c,
    seals: c.seals - def.price,
    cosmetics: { owned: [...c.cosmetics.owned, id], equipped: { ...c.cosmetics.equipped, [def.kind]: id } },
  };
}

export function equipCosmetic(c: Character, id: string): Character {
  const def = COSMETICS_BY_ID[id];
  if (!def || !ownsCosmetic(c, id)) return c;
  return { ...c, cosmetics: { ...c.cosmetics, equipped: { ...c.cosmetics.equipped, [def.kind]: id } } };
}

export function unequipCosmetic(c: Character, kind: CosmeticKind): Character {
  const equipped = { ...c.cosmetics.equipped };
  delete equipped[kind];
  return { ...c, cosmetics: { ...c.cosmetics, equipped } };
}

/** Что из косметики несёт автор чата: цвет имени и эмблема. */
export interface AuthorCosmetics {
  nameColor?: string;
  emblem?: string;
}

export function authorCosmetics(c: Character): AuthorCosmetics | undefined {
  const color = equippedCosmetic(c, 'nameColor')?.color;
  const emblem = equippedCosmetic(c, 'emblem')?.icon;
  if (!color && !emblem) return undefined;
  const out: AuthorCosmetics = {};
  if (color) out.nameColor = color;
  if (emblem) out.emblem = emblem;
  return out;
}

/** Склонение для витрины: 1 печать, 2 печати, 5 печатей. */
export function sealsText(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return `${n} печатей`;
  if (last === 1) return `${n} печать`;
  if (last >= 2 && last <= 4) return `${n} печати`;
  return `${n} печатей`;
}
