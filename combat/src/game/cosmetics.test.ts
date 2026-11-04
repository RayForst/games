import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS } from './achievements';
import { newCharacter, normalizeCharacter } from './character';
import {
  authorCosmetics,
  buyCosmetic,
  canBuyCosmetic,
  COSMETIC_KINDS,
  COSMETICS,
  COSMETICS_BY_ID,
  cosmeticsOf,
  equipCosmetic,
  equippedCosmetic,
  normalizeCosmetics,
  SEAL_PACKS,
  sealPackPrice,
  sealsForAchievement,
  sealsText,
  unequipCosmetic,
} from './cosmetics';
import type { Character } from './types';

describe('каталог косметики', () => {
  it('id уникальны, цены — целые положительные печати', () => {
    const ids = COSMETICS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of COSMETICS) {
      expect(Number.isInteger(c.price)).toBe(true);
      expect(c.price).toBeGreaterThan(0);
      expect(c.name.length).toBeGreaterThan(0);
    }
  });

  it('в каждом разделе есть что купить, рамок 6–8, цветов имени 4–5', () => {
    for (const kind of COSMETIC_KINDS) expect(cosmeticsOf(kind).length).toBeGreaterThan(0);
    expect(cosmeticsOf('frame').length).toBeGreaterThanOrEqual(6);
    expect(cosmeticsOf('frame').length).toBeLessThanOrEqual(8);
    expect(cosmeticsOf('nameColor').length).toBeGreaterThanOrEqual(4);
    expect(cosmeticsOf('nameColor').length).toBeLessThanOrEqual(5);
  });

  it('у рамок, цветов и фонов есть цвет, у эмблем — иконка', () => {
    for (const c of COSMETICS) {
      if (c.kind === 'frame' || c.kind === 'nameColor' || c.kind === 'cardBg') expect(c.color).toMatch(/^#[0-9a-f]{6}$/i);
      if (c.kind === 'emblem') expect(c.icon).toBeTruthy();
      if (c.kind === 'frame') expect(c.frameStyle).toBeTruthy();
    }
  });
});

describe('покупка и примерка', () => {
  const rich = (seals: number): Character => ({ ...newCharacter('Вася'), seals });

  it('новичок без печатей ничего не купит', () => {
    const c = newCharacter('Вася');
    expect(c.seals).toBe(0);
    expect(c.cosmetics).toEqual({ owned: [], equipped: {} });
    expect(canBuyCosmetic(c, 'frame-wood').ok).toBe(false);
    expect(buyCosmetic(c, 'frame-wood')).toBe(c);
  });

  it('покупка списывает печати и сразу надевает; второй раз не продаётся', () => {
    const c = buyCosmetic(rich(20), 'frame-wood');
    expect(c.seals).toBe(20 - COSMETICS_BY_ID['frame-wood'].price);
    expect(c.cosmetics.owned).toEqual(['frame-wood']);
    expect(equippedCosmetic(c, 'frame')?.id).toBe('frame-wood');
    expect(canBuyCosmetic(c, 'frame-wood')).toEqual({ ok: false, reason: 'Уже твоё' });
    expect(canBuyCosmetic(c, 'nope').ok).toBe(false);
  });

  it('надеть можно только своё, снять — только надетое; раздел один — вещь одна', () => {
    let c = rich(100);
    expect(equipCosmetic(c, 'frame-brass')).toBe(c);
    c = buyCosmetic(c, 'frame-wood');
    c = buyCosmetic(c, 'frame-brass');
    expect(equippedCosmetic(c, 'frame')?.id).toBe('frame-brass');
    c = equipCosmetic(c, 'frame-wood');
    expect(equippedCosmetic(c, 'frame')?.id).toBe('frame-wood');
    expect(c.cosmetics.owned).toHaveLength(2);
    c = unequipCosmetic(c, 'frame');
    expect(equippedCosmetic(c, 'frame')).toBeNull();
    expect(c.cosmetics.owned).toHaveLength(2);
  });

  it('автор чата получает цвет имени и эмблему только из надетого', () => {
    let c = rich(100);
    expect(authorCosmetics(c)).toBeUndefined();
    c = buyCosmetic(c, 'name-gold');
    expect(authorCosmetics(c)).toEqual({ nameColor: COSMETICS_BY_ID['name-gold'].color });
    c = buyCosmetic(c, 'emblem-wolf');
    expect(authorCosmetics(c)).toEqual({ nameColor: COSMETICS_BY_ID['name-gold'].color, emblem: 'wolf' });
    c = unequipCosmetic(c, 'nameColor');
    expect(authorCosmetics(c)).toEqual({ emblem: 'wolf' });
  });

  it('старый сейв получает печати и пустую косметику, мусор из каталога выбрасывается', () => {
    const raw = newCharacter('Вася') as Partial<Character>;
    delete raw.seals;
    delete raw.cosmetics;
    const c = normalizeCharacter(raw as Character);
    expect(c.seals).toBe(0);
    expect(c.cosmetics).toEqual({ owned: [], equipped: {} });
    const n = normalizeCosmetics({ owned: ['frame-wood', 'gone', 'frame-wood'], equipped: { frame: 'frame-brass', nameColor: 'frame-wood' } });
    expect(n).toEqual({ owned: ['frame-wood'], equipped: {} });
    expect(normalizeCosmetics({ owned: ['frame-wood'], equipped: { frame: 'frame-wood' } }).equipped).toEqual({ frame: 'frame-wood' });
  });
});

describe('печати князя', () => {
  it('каждое достижение даёт хотя бы одну печать, крупные — больше', () => {
    for (const a of ACHIEVEMENTS) expect(sealsForAchievement(a)).toBeGreaterThanOrEqual(1);
    expect(sealsForAchievement({ reward: 10 })).toBe(1);
    expect(sealsForAchievement({ reward: 100 })).toBe(3);
    expect(sealsForAchievement({ reward: 300 })).toBe(5);
    expect(sealsForAchievement({ reward: 300, seals: 9 })).toBe(9);
  });

  it('всех печатей за достижения хватает на несколько вещей, но не на всю лавку', () => {
    const total = ACHIEVEMENTS.reduce((s, a) => s + sealsForAchievement(a), 0);
    const cheapest = Math.min(...COSMETICS.map((c) => c.price));
    const all = COSMETICS.reduce((s, c) => s + c.price, 0);
    expect(total).toBeGreaterThan(cheapest * 3);
    expect(total).toBeLessThan(all);
  });

  it('обмен кредитов: пачка из пяти дешевле пяти по одной', () => {
    expect(SEAL_PACKS.map((p) => p.seals)).toEqual([1, 5]);
    expect(sealPackPrice(5)).toBeLessThan(sealPackPrice(1) * 5);
    expect(sealPackPrice(2)).toBe(sealPackPrice(1) * 2);
  });

  it('склонение', () => {
    expect(sealsText(1)).toBe('1 печать');
    expect(sealsText(3)).toBe('3 печати');
    expect(sealsText(5)).toBe('5 печатей');
    expect(sealsText(11)).toBe('11 печатей');
    expect(sealsText(21)).toBe('21 печать');
  });
});
