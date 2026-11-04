// Процедурные портреты бойцов: по сид-строке (имени) детерминированно собираем набор черт,
// а `components/Portrait.tsx` рисует их на SVG. Внешних картинок нет — только пути и эллипсы.
// Файл без React и react-native, чтобы генератор можно было гонять в vitest.

import type { RaceId } from '@/game/races';

export type FaceShape = 'oval' | 'square' | 'long' | 'round' | 'gaunt';
/**
 * Причёска или то, что надето на голову: капюшон, подшлемник, платок.
 * `braid` — коса (женщины и степняки), `loose` — распущенные волосы (женщины).
 */
export type HairStyle = 'bald' | 'cropped' | 'shaggy' | 'long' | 'hood' | 'coif' | 'scarf' | 'braid' | 'loose';
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
export type Sex = 'm' | 'f';

export interface PortraitSpec {
  /** Пол: у женщин нет бороды, свои причёски, мягче челюсть; остальное — тот же мрачный тон. */
  sex: Sex;
  /** Раса (`game/races.ts`): геометрия лица, уши, клыки, кожа. Нет — обычный человек, как было. */
  race?: RaceId;
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
/** Орки: зеленовато-серая кожа, приглушённо — к этому цвету подмешивается обычный тон. */
export const ORC_SKIN = '#6f7a66';
/** Болотники: бледная кожа с прозеленью. */
export const BOG_SKIN = '#bcc2a4';
/** Степняки: смуглее, тёплый тон. */
export const STEPPE_SKIN = '#9c7a52';
/** Волосы болотников: тёмные, как мокрые. */
export const BOG_HAIR = '#2b281f';

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

// --- Пол по имени.

/** Слова, по которым кличка женская независимо от остального: «Вдова Нюра», «Чья-то Тёща». */
const FEMALE_WORDS = new Set([
  'вдова', 'бестия', 'кошка', 'тёща', 'теща', 'баба', 'бабка', 'девка', 'ведьма', 'знахарка', 'сестра', 'мать', 'матушка',
  'старуха', 'дочь', 'дочка', 'жена', 'невеста', 'хозяйка', 'торговка', 'прачка', 'кухарка', 'травница', 'волчица', 'лиса',
  'крыса-мать', 'нюра', 'марфа', 'глаша', 'дуня', 'фрося', 'настя', 'катя', 'маша', 'ольга', 'оля', 'таня', 'ира', 'лена',
  'аня', 'анна', 'мария', 'дарья', 'даша', 'варя', 'варвара', 'зина', 'нина', 'люба', 'вера', 'надя', 'галя', 'тоня',
  'агафья', 'лукерья', 'пелагея', 'матрёна', 'матрена', 'акулина', 'прасковья', 'ефросинья', 'василиса', 'ульяна', 'устинья',
]);

/** Мужские имена и клички на -а/-я, чтобы «Крыса Вася» не стал женщиной. */
const MALE_WORDS = new Set([
  'вася', 'жора', 'гоша', 'бодя', 'пашка', 'стёпа', 'степа', 'гриня', 'федька', 'васька', 'серёга', 'серега', 'петруха',
  'ерёма', 'ерема', 'яшка', 'егорка', 'прошка', 'коля', 'толя', 'саня', 'миша', 'витя', 'дима', 'сеня', 'лёня', 'леня',
  'гена', 'юра', 'ваня', 'петя', 'кузя', 'федя', 'слава', 'данила', 'никита', 'илья', 'фома', 'кузьма', 'савва', 'лука',
  'митя', 'лёва', 'лева', 'боря', 'шура', 'саша', 'женя', 'валя', 'гаврила', 'ярёма', 'сёма', 'сема', 'тёма', 'тема', 'рома',
  'костя', 'стас', 'лёха', 'леха', 'тоха', 'алёша', 'алеша', 'гришка', 'мишка', 'ванька', 'колька', 'сашка', 'стёпка',
  'кожемяка', 'дядя', 'гнида', 'тихоня', 'сопля', 'задира', 'оглобля', 'голова', 'расстрига', 'детина', 'верзила', 'громила',
  'дылда', 'бродяга', 'пьяница', 'каланча', 'сирота', 'судья', 'воевода', 'старшина', 'батька', 'папаня', 'братва',
]);

const isMaleAdjective = (w: string) => /(ый|ий|ой)$/.test(w) && w.length > 3;
const isFemaleAdjective = (w: string) => /(ая|яя|ья)$/.test(w) && w.length > 3;
/** Слова на согласную, -й, -о/-е/-ы/-и/-у: «Макс», «Гопник», «Радо» — мужские. На -ь не судим («Тень», «Жердь»). */
const isMaleEnding = (w: string) => /[бвгджзклмнпрстфхцчшщйоеёыиу]$/.test(w) || /(арь|ырь|ец|ич|ок|ёк|ек)$/.test(w);
const isFemaleEnding = (w: string) => /[ая]$/.test(w);

/**
 * Пол по имени, если его можно понять: явные слова («Вдова», «Бестия»), женские прилагательные («Рыжая», «Чёрная»),
 * мужские имена и клички («Вася», «Гопник»), и только потом окончание -а/-я у последнего слова. Иначе `null` — решит сид.
 */
export function sexFromName(name: string): Sex | null {
  const words = name
    .toLowerCase()
    .split(/[\s-]+/)
    .map((w) => w.replace(/[^а-яёa-z]/g, ''))
    .filter(Boolean);
  if (words.length === 0) return null;
  if (words.some((w) => FEMALE_WORDS.has(w))) return 'f';
  if (words.some((w) => MALE_WORDS.has(w))) return 'm';
  if (words.some(isFemaleAdjective)) return 'f';
  if (words.some(isMaleAdjective)) return 'm';
  if (words.some(isMaleEnding)) return 'm';
  const last = words[words.length - 1];
  if (isFemaleEnding(last)) return 'f';
  return null;
}

/** Черты по сиду, без переопределений. Порядок вызовов rng фиксирован — не переставлять, новые броски только в конец. */
export function rollPortrait(seed: string): PortraitSpec {
  const rng = seededRng(hashSeed(seed));
  const age = weighted<Age>(rng, { young: 30, mid: 50, old: 20 });
  const face = weighted<FaceShape>(rng, { oval: 25, square: 25, long: 15, round: 15, gaunt: 20 });
  const skin = pick(rng, SKIN_TONES);
  let hair = weighted<HairStyle>(rng, { bald: 10, cropped: 30, shaggy: 25, long: 13, hood: 10, coif: 12, scarf: 0, braid: 0, loose: 0 });
  const baseHair = pick(rng, HAIR_COLORS);
  const hairColor = age === 'old' ? GREY_HAIR : baseHair;
  let beard = weighted<Beard>(rng, { none: 30, stubble: 25, short: 20, full: 15, goatee: 10 });
  const eyes = weighted<Eyes>(rng, { open: 70, narrow: 20, 'patch-left': 5, 'patch-right': 5, hidden: 0 });
  const eyeColor = pick(rng, EYE_COLORS);
  const brow = weighted<Brow>(rng, { thin: 40, heavy: 60 });
  const nose = weighted<Nose>(rng, { straight: 60, broken: 25, wide: 15 });
  const mouth = weighted<Mouth>(rng, { flat: 50, grim: 35, grin: 15 });
  const scar = weighted<Scar>(rng, { none: 55, cheek: 20, brow: 15, across: 10 });
  const earring = weighted<Earring>(rng, { none: 75, left: 13, right: 12 });
  const shoulders = weighted<Shoulders>(rng, { shirt: 40, leather: 30, mail: 15, cloak: 15, apron: 0 });
  const cloth = pick(rng, CLOTH_COLORS);
  // Пол — последним броском, чтобы мужские лица из старых сейвов не поменялись.
  const sex: Sex = sexFromName(seed) ?? (rng() < 0.22 ? 'f' : 'm');
  if (sex === 'f') {
    beard = 'none';
    // Коса, распущенные, платок; капюшон и бритая голова — редко. Своя причёска не зависит от мужского броска.
    hair = weighted<HairStyle>(rng, { braid: 32, loose: 28, scarf: 22, cropped: 6, hood: 7, coif: 5, bald: 0, shaggy: 0, long: 0 });
  }
  return { sex, face, skin, hair, hairColor, beard, eyes, eyeColor, brow, nose, mouth, scar, earring, age, shoulders, cloth };
}

/**
 * Расовые черты поверх базовых (`game/races.ts`). Геометрию лица, уши и клыки рисует компонент по `spec.race`;
 * здесь — то, что выражается через уже имеющиеся черты: кожа, волосы, борода, глаза. Без расы ничего не меняется.
 */
export function applyRaceLook(base: PortraitSpec, race?: RaceId): PortraitSpec {
  if (!race) return base;
  const s: PortraitSpec = { ...base, race };
  const male = s.sex === 'm';
  switch (race) {
    case 'human':
      break;
    case 'karl':
      // Борода гуще: у кого не было — щетина, у кого была — на ступень плотнее.
      if (male) s.beard = s.beard === 'none' ? 'stubble' : s.beard === 'stubble' ? 'short' : s.beard === 'goatee' ? 'short' : 'full';
      break;
    case 'halfblood':
      // Тоньше лицо: широкие формы уходят в узкие.
      if (s.face === 'round') s.face = 'oval';
      if (s.face === 'square') s.face = 'long';
      break;
    case 'steppe':
      s.skin = mixHex(s.skin, STEPPE_SKIN, 0.45);
      if (s.eyes === 'open') s.eyes = 'narrow';
      // Косы носят и мужчины.
      if (s.hair === 'long' || s.hair === 'shaggy' || s.hair === 'loose') s.hair = 'braid';
      if (s.hairColor !== GREY_HAIR) s.hairColor = mixHex(s.hairColor, '#1c140e', 0.5);
      break;
    case 'orc':
      s.skin = mixHex(s.skin, ORC_SKIN, 0.7);
      if (s.nose === 'straight') s.nose = 'wide';
      if (s.hairColor !== GREY_HAIR) s.hairColor = mixHex(s.hairColor, '#171310', 0.6);
      // Фартук и кольчуга остаются, рубаха чаще кожа.
      if (s.shoulders === 'shirt') s.shoulders = 'leather';
      break;
    case 'bog':
      s.skin = mixHex(s.skin, BOG_SKIN, 0.6);
      // Волосы редкие: густое — в короткое, борода — в щетину.
      if (s.hair === 'shaggy' || s.hair === 'long' || s.hair === 'loose') s.hair = 'cropped';
      if (s.hair === 'braid') s.hair = 'scarf';
      if (s.beard === 'full' || s.beard === 'short') s.beard = 'stubble';
      if (s.hairColor !== GREY_HAIR) s.hairColor = BOG_HAIR;
      break;
  }
  return s;
}

/**
 * Именные соперники (`game/rivals.ts`) узнаются в лицо: черты зафиксированы по характеру.
 * Что не указано — добирается из сида по имени. Таблица накладывается поверх расовых черт.
 */
export const RIVAL_PORTRAITS: Record<string, Partial<PortraitSpec>> = {
  // Наглый молодой гопник-степняк: ухмылка, сломанный нос, серьга, щетина, узкие глаза.
  tolyan: { sex: 'm', age: 'young', face: 'round', hair: 'cropped', hairColor: '#2e2219', beard: 'stubble', eyes: 'narrow', brow: 'heavy', nose: 'broken', mouth: 'grin', scar: 'brow', earring: 'left', shoulders: 'shirt' },
  // Хромой старик-карл: седой, длинные волосы, борода, прищур.
  bart: { sex: 'm', age: 'old', face: 'gaunt', hair: 'long', hairColor: GREY_HAIR, beard: 'full', eyes: 'narrow', brow: 'thin', nose: 'straight', mouth: 'grim', scar: 'none', earring: 'none', shoulders: 'leather' },
  // Вдова в платке: бледная, ровный взгляд, ни шрамов, ни серёг.
  nyura: { sex: 'f', age: 'mid', face: 'oval', hair: 'scarf', hairColor: '#2a1f17', beard: 'none', eyes: 'open', brow: 'thin', nose: 'straight', mouth: 'flat', scar: 'none', earring: 'none', shoulders: 'cloak', cloth: '#2d2926', skin: PALE_SKIN },
  // Мясник-орк: лысый, тяжёлый, в фартуке, серая кожа.
  butcher: { sex: 'm', age: 'mid', face: 'square', hair: 'bald', beard: 'short', eyes: 'open', brow: 'heavy', nose: 'wide', mouth: 'flat', scar: 'cheek', earring: 'none', shoulders: 'apron', skin: mixHex(RUDDY_SKIN, ORC_SKIN, 0.65) },
  // Тень: капюшон до подбородка, лица не видно.
  shadow: { sex: 'm', age: 'mid', face: 'gaunt', hair: 'hood', beard: 'none', eyes: 'hidden', brow: 'thin', nose: 'straight', mouth: 'flat', scar: 'none', earring: 'none', shoulders: 'cloak', cloth: '#2b2f33', skin: PALE_SKIN },
  // Старый солдат: седой ёжик, шрам через всё лицо, кольчуга.
  soldier: { sex: 'm', age: 'old', face: 'square', hair: 'cropped', hairColor: GREY_HAIR, beard: 'short', eyes: 'open', brow: 'heavy', nose: 'broken', mouth: 'grim', scar: 'across', earring: 'none', shoulders: 'mail', cloth: '#4b4136' },
};

const cache = new Map<string, PortraitSpec>();

/**
 * Готовый набор черт: сид → случайные черты, поверх них раса, поверх — таблица именных. Результат кэшируется.
 * Без `race` — как раньше, обычный человек.
 */
export function portraitSpec(seed: string, rivalId?: string, race?: RaceId): PortraitSpec {
  const key = `${rivalId ?? ''}\u0000${race ?? ''}\u0000${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = applyRaceLook(rollPortrait(seed), race);
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
