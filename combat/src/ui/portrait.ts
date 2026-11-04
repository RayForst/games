// Процедурные портреты бойцов: по сид-строке (имени) детерминированно собираем набор черт,
// а `components/Portrait.tsx` рисует их на SVG. Внешних картинок нет — только пути и эллипсы.
// Файл без React и react-native, чтобы генератор можно было гонять в vitest.

export type FaceShape = 'oval' | 'square' | 'long' | 'round' | 'gaunt';
/** Причёска или то, что надето на голову: капюшон, подшлемник, платок. */
export type HairStyle = 'bald' | 'cropped' | 'shaggy' | 'long' | 'hood' | 'coif' | 'scarf';
export type Beard = 'none' | 'stubble' | 'short' | 'full' | 'goatee';
/** `hidden` — лицо в тени капюшона, глаз не видно (только через переопределение). */
export type Eyes = 'open' | 'narrow' | 'patch-left' | 'patch-right' | 'hidden';
export type Scar = 'none' | 'cheek' | 'brow' | 'across';
export type Nose = 'straight' | 'broken' | 'wide';
export type Earring = 'none' | 'left' | 'right';
export type Mouth = 'flat' | 'grim' | 'grin';
export type Age = 'young' | 'mid' | 'old';
export type Brow = 'thin' | 'heavy';
export type Shoulders = 'shirt' | 'leather' | 'mail' | 'cloak' | 'apron';

export interface PortraitSpec {
  face: FaceShape;
  /** Цвет кожи, hex. */
  skin: string;
  hair: HairStyle;
  hairColor: string;
  beard: Beard;
  eyes: Eyes;
  eyeColor: string;
  brow: Brow;
  nose: Nose;
  mouth: Mouth;
  scar: Scar;
  earring: Earring;
  age: Age;
  shoulders: Shoulders;
  /** Цвет одежды на плечах, hex. */
  cloth: string;
}

// Приглушённая палитра в духе темы (`theme.ts`: дерево, кожа, латунь, кровь). Значения продублированы,
// потому что theme.ts тянет react-native, а этот файл должен работать в node.
export const SKIN_TONES = ['#c9a683', '#b9926c', '#a67f5c', '#8e6747', '#d4b79a', '#7b5a41'] as const;
export const HAIR_COLORS = ['#2a1f17', '#4a3524', '#6b4a2e', '#8a6c40', '#6e3a2a', '#948b80'] as const;
export const EYE_COLORS = ['#2f2620', '#4a3b2a', '#3f4f4a', '#56626b'] as const;
export const CLOTH_COLORS = ['#3a2f26', '#2d2926', '#4a3b2e', '#2b2f33', '#3d2b22', '#4b4136'] as const;
export const GREY_HAIR = '#a39b90';
export const PALE_SKIN = '#d4b79a';
export const RUDDY_SKIN = '#b9826a';

/** FNV-1a по кодам символов: один и тот же сид — одно и то же число на любой платформе. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** mulberry32: маленький детерминированный генератор, хватает для выбора вариантов. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weighted<T extends string>(rng: () => number, table: Record<T, number>): T {
  const entries = Object.entries(table) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Черты по сиду, без переопределений. Порядок вызовов rng фиксирован — не переставлять. */
export function rollPortrait(seed: string): PortraitSpec {
  const rng = seededRng(hashSeed(seed));
  const age = weighted<Age>(rng, { young: 30, mid: 50, old: 20 });
  const face = weighted<FaceShape>(rng, { oval: 25, square: 25, long: 15, round: 15, gaunt: 20 });
  const skin = pick(rng, SKIN_TONES);
  const hair = weighted<HairStyle>(rng, { bald: 10, cropped: 30, shaggy: 25, long: 13, hood: 10, coif: 12, scarf: 0 });
  const baseHair = pick(rng, HAIR_COLORS);
  const hairColor = age === 'old' ? GREY_HAIR : baseHair;
  const beard = weighted<Beard>(rng, { none: 30, stubble: 25, short: 20, full: 15, goatee: 10 });
  const eyes = weighted<Eyes>(rng, { open: 70, narrow: 20, 'patch-left': 5, 'patch-right': 5, hidden: 0 });
  const eyeColor = pick(rng, EYE_COLORS);
  const brow = weighted<Brow>(rng, { thin: 40, heavy: 60 });
  const nose = weighted<Nose>(rng, { straight: 60, broken: 25, wide: 15 });
  const mouth = weighted<Mouth>(rng, { flat: 50, grim: 35, grin: 15 });
  const scar = weighted<Scar>(rng, { none: 55, cheek: 20, brow: 15, across: 10 });
  const earring = weighted<Earring>(rng, { none: 75, left: 13, right: 12 });
  const shoulders = weighted<Shoulders>(rng, { shirt: 40, leather: 30, mail: 15, cloak: 15, apron: 0 });
  const cloth = pick(rng, CLOTH_COLORS);
  return { face, skin, hair, hairColor, beard, eyes, eyeColor, brow, nose, mouth, scar, earring, age, shoulders, cloth };
}

/**
 * Именные соперники (`game/rivals.ts`) узнаются в лицо: черты зафиксированы по характеру.
 * Что не указано — добирается из сида по имени.
 */
export const RIVAL_PORTRAITS: Record<string, Partial<PortraitSpec>> = {
  // Наглый молодой гопник: ухмылка, сломанный нос, серьга, щетина.
  tolyan: { age: 'young', face: 'round', hair: 'cropped', hairColor: '#4a3524', beard: 'stubble', eyes: 'open', brow: 'heavy', nose: 'broken', mouth: 'grin', scar: 'brow', earring: 'left', shoulders: 'shirt' },
  // Хромой старик: седой, длинные волосы, борода, прищур.
  bart: { age: 'old', face: 'gaunt', hair: 'long', hairColor: GREY_HAIR, beard: 'full', eyes: 'narrow', brow: 'thin', nose: 'straight', mouth: 'grim', scar: 'none', earring: 'none', shoulders: 'leather' },
  // Вдова в платке: бледная, ровный взгляд, ни шрамов, ни серёг.
  nyura: { age: 'mid', face: 'oval', hair: 'scarf', hairColor: '#2a1f17', beard: 'none', eyes: 'open', brow: 'thin', nose: 'straight', mouth: 'flat', scar: 'none', earring: 'none', shoulders: 'cloak', cloth: '#2d2926', skin: PALE_SKIN },
  // Мясник: лысый, тяжёлый, в фартуке.
  butcher: { age: 'mid', face: 'square', hair: 'bald', beard: 'short', eyes: 'open', brow: 'heavy', nose: 'wide', mouth: 'flat', scar: 'cheek', earring: 'none', shoulders: 'apron', skin: RUDDY_SKIN },
  // Тень: капюшон до подбородка, лица не видно.
  shadow: { age: 'mid', face: 'gaunt', hair: 'hood', beard: 'none', eyes: 'hidden', brow: 'thin', nose: 'straight', mouth: 'flat', scar: 'none', earring: 'none', shoulders: 'cloak', cloth: '#2b2f33', skin: PALE_SKIN },
  // Старый солдат: седой ёжик, шрам через всё лицо, кольчуга.
  soldier: { age: 'old', face: 'square', hair: 'cropped', hairColor: GREY_HAIR, beard: 'short', eyes: 'open', brow: 'heavy', nose: 'broken', mouth: 'grim', scar: 'across', earring: 'none', shoulders: 'mail', cloth: '#4b4136' },
};

const cache = new Map<string, PortraitSpec>();

/** Готовый набор черт: сид → случайные черты, поверх них таблица именных. Результат кэшируется. */
export function portraitSpec(seed: string, rivalId?: string): PortraitSpec {
  const key = `${rivalId ?? ''}\u0000${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = rollPortrait(seed);
  const spec = rivalId && RIVAL_PORTRAITS[rivalId] ? { ...base, ...RIVAL_PORTRAITS[rivalId] } : base;
  cache.set(key, spec);
  return spec;
}

/** Смешать два hex-цвета: t=0 — первый, t=1 — второй. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const k = Math.max(0, Math.min(1, t));
  const ch = (shift: number) => {
    const x = (pa >> shift) & 255;
    const y = (pb >> shift) & 255;
    return Math.round(x + (y - x) * k);
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
