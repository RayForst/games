import { describe, expect, it } from 'vitest';

import { RIVALS } from '@/game/rivals';
import { RACES } from '@/game/races';
import { applyRaceLook, hashSeed, mixHex, portraitSpec, RIVAL_PORTRAITS, rollPortrait, seededRng, sexFromName } from './portrait';

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
        "sex": "m",
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
    // «Боец» — мужское слово, женских причёсок тут не будет; фартук и скрытое лицо — только по переопределениям.
    expect(specs.every((s) => s.sex === 'm')).toBe(true);
    expect(specs.some((s) => s.hair === 'scarf' || s.hair === 'braid' || s.hair === 'loose' || s.shoulders === 'apron' || s.eyes === 'hidden')).toBe(false);
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
    expect(portraitSpec('Вдова Нюра', 'nyura')).toMatchObject({ sex: 'f', hair: 'scarf', beard: 'none' });
    // Раса не ломает именных: Мясник-орк лысый и в фартуке, Нюра-полукровка в платке, Толян-степняк с ухмылкой.
    expect(portraitSpec('Мясник', 'butcher', 'orc')).toMatchObject({ hair: 'bald', shoulders: 'apron', race: 'orc' });
    expect(portraitSpec('Вдова Нюра', 'nyura', 'halfblood')).toMatchObject({ sex: 'f', hair: 'scarf', race: 'halfblood' });
    expect(portraitSpec('Гопник Толян', 'tolyan', 'steppe')).toMatchObject({ mouth: 'grin', eyes: 'narrow', sex: 'm' });
    for (const r of RIVALS) expect(RIVAL_PORTRAITS[r.id].sex).toBe(r.id === 'nyura' ? 'f' : 'm');
    expect(portraitSpec('Мясник', 'butcher')).toMatchObject({ shoulders: 'apron', hair: 'bald' });
    expect(portraitSpec('Тень', 'shadow')).toMatchObject({ hair: 'hood', eyes: 'hidden' });
    expect(portraitSpec('Старый Солдат', 'soldier')).toMatchObject({ hairColor: '#a39b90', scar: 'across', shoulders: 'mail' });
    // Без id генератор не знает про именных: за сопоставление по имени отвечает компонент.
    expect(portraitSpec('Тень').eyes).not.toBe('hidden');
    // Переопределение не ломает кэш по сиду.
    expect(portraitSpec('Тень', 'shadow')).toBe(portraitSpec('Тень', 'shadow'));
    expect(portraitSpec('Тень', 'shadow')).not.toBe(portraitSpec('Тень'));
  });

  it('пол по имени: явные слова, прилагательные, мужские клички, окончание', () => {
    expect(sexFromName('Вдова Нюра')).toBe('f');
    expect(sexFromName('Рыжая Бестия')).toBe('f');
    expect(sexFromName('Чёрная Кошка')).toBe('f');
    expect(sexFromName('Солдатская Вдова')).toBe('f');
    expect(sexFromName('Чья-то Тёща')).toBe('f');
    expect(sexFromName('Марфа')).toBe('f');
    // Окончание -а/-я у клички — женское, если ничего не говорит об обратном.
    expect(sexFromName('Злюка')).toBe('f');
    // Мужские имена и клички на -а/-я остаются мужскими.
    expect(sexFromName('Крыса Вася')).toBe('m');
    expect(sexFromName('Дядя Жора')).toBe('m');
    expect(sexFromName('Стёпа Оглобля')).toBe('m');
    expect(sexFromName('Гриня Два Ножа')).toBe('m');
    expect(sexFromName('Кожемяка')).toBe('m');
    expect(sexFromName('Гопник Толян')).toBe('m');
    expect(sexFromName('Хромой Барт')).toBe('m');
    expect(sexFromName('Монах-расстрига')).toBe('m');
    expect(sexFromName('Макс Удавка')).toBe('m');
    expect(sexFromName('Знахарь')).toBe('m');
    // На -ь не судим — решает сид.
    expect(sexFromName('Тень')).toBeNull();
    expect(sexFromName('Жердь')).toBeNull();
    expect(sexFromName('')).toBeNull();
  });

  it('женщины: без бороды, свои причёски, остальное мрачное как у всех', () => {
    const women = Array.from({ length: 150 }, (_, i) => rollPortrait(`Баба ${i}`));
    expect(women.every((s) => s.sex === 'f' && s.beard === 'none')).toBe(true);
    const hairs = new Set(women.map((s) => s.hair));
    expect(hairs.has('braid')).toBe(true);
    expect(hairs.has('loose')).toBe(true);
    expect(hairs.has('scarf')).toBe(true);
    expect(hairs.has('shaggy') || hairs.has('long') || hairs.has('bald')).toBe(false);
    // Шрамы, повязки и серьги остаются.
    expect(women.some((s) => s.scar !== 'none')).toBe(true);
    expect(women.some((s) => s.eyes.startsWith('patch'))).toBe(true);
    // Пол по сиду, когда имя не говорит: детерминированно, и женщины встречаются.
    const bySeed = ['Жердь', 'Тень', 'Свирель', 'Мишень', 'Пядь', 'Гать', 'Моль', 'Рать', 'Ось', 'Сель', 'Соль', 'Хворь'];
    const sexes = bySeed.map((n) => rollPortrait(n).sex);
    expect(sexes).toEqual(bySeed.map((n) => rollPortrait(n).sex));
    // Сид решает по-разному: на дюжине имён найдутся оба пола.
    const many = Array.from({ length: 120 }, (_, i) => rollPortrait(`Хворь ${'ь'.repeat(i)}`).sex);
    expect(new Set(many).size).toBe(2);
  });

  it('расовые черты: детерминированы, без расы ничего не меняется', () => {
    const base = rollPortrait('Крыса Вася');
    expect(applyRaceLook(base)).toBe(base);
    expect(applyRaceLook(base, 'human')).toMatchObject({ ...base, race: 'human' });
    for (const r of RACES) {
      expect(applyRaceLook(base, r.id)).toEqual(applyRaceLook(base, r.id));
      expect(portraitSpec('Крыса Вася', undefined, r.id)).toBe(portraitSpec('Крыса Вася', undefined, r.id));
      expect(portraitSpec('Крыса Вася', undefined, r.id).race).toBe(r.id);
    }
    expect(portraitSpec('Крыса Вася').race).toBeUndefined();
    expect(portraitSpec('Крыса Вася', undefined, 'orc')).not.toBe(portraitSpec('Крыса Вася'));

    const men = Array.from({ length: 120 }, (_, i) => rollPortrait(`Боец ${i}`));
    // Карлы: борода гуще — у мужчин ни одного без бороды.
    expect(men.map((s) => applyRaceLook(s, 'karl')).every((s) => s.beard !== 'none')).toBe(true);
    expect(men.map((s) => applyRaceLook(s, 'karl')).filter((s) => s.beard === 'full').length).toBeGreaterThan(men.filter((s) => s.beard === 'full').length);
    // Степняки: узкие глаза, косы вместо длинных волос, смуглее.
    const steppe = men.map((s) => applyRaceLook(s, 'steppe'));
    expect(steppe.every((s) => s.eyes !== 'open')).toBe(true);
    expect(steppe.some((s) => s.hair === 'braid')).toBe(true);
    expect(steppe.every((s) => s.hair !== 'long' && s.hair !== 'shaggy')).toBe(true);
    // Орки: серо-зелёная кожа, широкий или сломанный нос.
    const orcs = men.map((s) => applyRaceLook(s, 'orc'));
    expect(orcs.every((s) => s.nose !== 'straight')).toBe(true);
    expect(new Set(orcs.map((s) => s.skin)).size).toBeGreaterThan(1);
    expect(orcs.every((s, i) => s.skin !== men[i].skin)).toBe(true);
    // Болотники: редкие волосы, бледная кожа с прозеленью.
    const bogs = men.map((s) => applyRaceLook(s, 'bog'));
    expect(bogs.every((s) => s.hair !== 'long' && s.hair !== 'shaggy' && s.beard !== 'full')).toBe(true);
    expect(bogs.every((s, i) => s.skin !== men[i].skin)).toBe(true);
    // Полукровки: без круглых и квадратных лиц.
    expect(men.map((s) => applyRaceLook(s, 'halfblood')).every((s) => s.face !== 'round' && s.face !== 'square')).toBe(true);
    // Женщина-карл бороды не отращивает.
    expect(applyRaceLook(rollPortrait('Баба Нюра'), 'karl').beard).toBe('none');
  });

  it('смешивание цветов', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#c9a683', '#000000', 2)).toBe('#000000');
  });
});
