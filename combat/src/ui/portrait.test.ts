import { describe, expect, it } from 'vitest';

import { RIVALS } from '@/game/rivals';
import { hashSeed, mixHex, portraitSpec, RIVAL_PORTRAITS, rollPortrait, seededRng } from './portrait';

describe('процедурные портреты', () => {
  it('одно имя — одно лицо, разные имена — разные', () => {
    expect(rollPortrait('Крыса Вася')).toEqual(rollPortrait('Крыса Вася'));
    expect(portraitSpec('Крыса Вася')).toBe(portraitSpec('Крыса Вася'));
    expect(hashSeed('Крыса Вася')).toBe(hashSeed('Крыса Вася'));
    expect(hashSeed('Крыса Вася')).not.toBe(hashSeed('Крыса Васи'));
    // Снимок конкретного лица: если формула дёрнется, старые портреты поменяются — тест скажет.
    expect(rollPortrait('Гопник Толян')).toMatchInlineSnapshot(`
      {
        "age": "mid",
        "beard": "goatee",
        "brow": "heavy",
        "cloth": "#4b4136",
        "earring": "right",
        "eyeColor": "#56626b",
        "eyes": "open",
        "face": "long",
        "hair": "shaggy",
        "hairColor": "#2a1f17",
        "mouth": "flat",
        "nose": "wide",
        "scar": "none",
        "shoulders": "shirt",
        "skin": "#d4b79a",
      }
    `);
  });

  it('генератор даёт разнообразие по каждой черте', () => {
    const names = Array.from({ length: 200 }, (_, i) => `Боец ${i}`);
    const specs = names.map((n) => rollPortrait(n));
    const distinct = (key: keyof ReturnType<typeof rollPortrait>) => new Set(specs.map((s) => s[key])).size;
    expect(distinct('face')).toBe(5);
    expect(distinct('hair')).toBe(6);
    expect(distinct('beard')).toBe(5);
    expect(distinct('eyes')).toBe(4);
    expect(distinct('scar')).toBe(4);
    expect(distinct('nose')).toBe(3);
    expect(distinct('earring')).toBe(3);
    expect(distinct('shoulders')).toBe(4);
    expect(distinct('skin')).toBeGreaterThanOrEqual(5);
    // Платок, фартук и скрытое лицо — только по переопределениям.
    expect(specs.some((s) => s.hair === 'scarf' || s.shoulders === 'apron' || s.eyes === 'hidden')).toBe(false);
    // Старики седые.
    expect(specs.filter((s) => s.age === 'old').every((s) => s.hairColor === '#a39b90')).toBe(true);
  });

  it('rng равномерный и детерминированный', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(xs.map(() => b())).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(xs.reduce((s, x) => s + x, 0) / xs.length).toBeCloseTo(0.5, 1);
  });

  it('именные соперники узнаются в лицо', () => {
    for (const r of RIVALS) expect(RIVAL_PORTRAITS[r.id]).toBeDefined();
    const tolyan = portraitSpec('Гопник Толян', 'tolyan');
    expect(tolyan.mouth).toBe('grin');
    expect(tolyan.nose).toBe('broken');
    expect(tolyan.age).toBe('young');
    expect(portraitSpec('Хромой Барт', 'bart')).toMatchObject({ age: 'old', hairColor: '#a39b90', beard: 'full' });
    expect(portraitSpec('Вдова Нюра', 'nyura')).toMatchObject({ hair: 'scarf', beard: 'none' });
    expect(portraitSpec('Мясник', 'butcher')).toMatchObject({ shoulders: 'apron', hair: 'bald' });
    expect(portraitSpec('Тень', 'shadow')).toMatchObject({ hair: 'hood', eyes: 'hidden' });
    expect(portraitSpec('Старый Солдат', 'soldier')).toMatchObject({ hairColor: '#a39b90', scar: 'across', shoulders: 'mail' });
    // Без id генератор не знает про именных: за сопоставление по имени отвечает компонент.
    expect(portraitSpec('Тень').eyes).not.toBe('hidden');
    // Переопределение не ломает кэш по сиду.
    expect(portraitSpec('Тень', 'shadow')).toBe(portraitSpec('Тень', 'shadow'));
    expect(portraitSpec('Тень', 'shadow')).not.toBe(portraitSpec('Тень'));
  });

  it('смешивание цветов', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#c9a683', '#000000', 2)).toBe('#000000');
  });
});
