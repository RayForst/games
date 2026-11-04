import { describe, expect, it } from 'vitest';

import { canEquip, deriveCharacter, handsConflict, newCharacter, newInventoryItem, normalizeCharacter, prepareEquip, targetSlot } from './character';
import { deriveStats, baseStats } from './formulas';
import { getItem, ITEMS, isTwoHanded, itemsForSlot, maxDurability } from './items';
import { generateOpponent } from './opponents';
import { RING_SLOTS, SLOTS, type Character } from './types';

/** Персонаж нужного уровня с силой под любую вещь и надетыми вещами. */
function hero(level: number, equipped: string[] = []): Character {
  const c = newCharacter('Вася', { ...baseStats(), strength: 20, intuition: 12 });
  c.level = level;
  for (const id of equipped) {
    const uid = `u-${id}-${c.backpack.length}`;
    c.backpack.push(newInventoryItem(uid, id));
    const slot = targetSlot(c, getItem(id));
    c.equipment[slot] = uid;
  }
  return c;
}

describe('кольца и амулеты', () => {
  it('в каталоге 8–11 колец и 6 амулетов на уровни 0–6', () => {
    const rings = itemsForSlot('ring');
    const amulets = itemsForSlot('amulet');
    expect(rings.length).toBeGreaterThanOrEqual(8);
    expect(amulets.length).toBe(6);
    expect(Math.min(...rings.map((r) => r.level))).toBe(0);
    expect(Math.max(...rings.map((r) => r.level))).toBe(6);
    for (const i of [...rings, ...amulets]) {
      expect(i.damage).toBeUndefined();
      expect(i.bonus).toBeDefined();
      expect(maxDurability(i)).toBeGreaterThan(0);
    }
  });

  it('бонусы колец и амулета складываются в производные характеристики', () => {
    const base = deriveStats(baseStats(), 3, []);
    const d = deriveStats(baseStats(), 3, ['headsman-ring', 'copper-ring', 'ladanka']);
    expect(d.crit).toBe(base.crit + 5);
    expect(d.antiDodge).toBe(base.antiDodge + 3);
    expect(d.maxHp).toBe(base.maxHp + 3 + 5);
    expect(d.antiCrit).toBe(base.antiCrit + 2);
    // Два одинаковых кольца — двойной бонус.
    const two = deriveStats(baseStats(), 1, ['iron-ring', 'iron-ring']);
    expect(two.stats.strength).toBe(base.stats.strength + 2);
  });

  it('кольцо ложится в свободный слот, третье заменяет первое', () => {
    const c = hero(1);
    expect(targetSlot(c, getItem('copper-ring'))).toBe('ring1');
    const one = hero(1, ['copper-ring']);
    expect(targetSlot(one, getItem('bone-ring'))).toBe('ring2');
    const both = hero(1, ['copper-ring', 'bone-ring']);
    expect(both.equipment.ring1).toBeTruthy();
    expect(both.equipment.ring2).toBeTruthy();
    const p = prepareEquip(both, getItem('iron-ring'));
    expect(p.slot).toBe('ring1');
    expect(p.freed).toEqual(['ring1']);
    expect(p.character.equipment.ring1).toBeNull();
    expect(p.character.equipment.ring2).toBe(both.equipment.ring2);
    expect(targetSlot(c, getItem('wolf-fang'))).toBe('amulet');
  });
});

describe('двуручное оружие', () => {
  it('в каталоге 5–6 двуручников, урон выше одноручного того же уровня', () => {
    const two = ITEMS.filter((i) => i.twoHanded);
    expect(two.length).toBeGreaterThanOrEqual(5);
    expect(two.length).toBeLessThanOrEqual(6);
    for (const w of two) {
      expect(w.slot).toBe('weapon');
      expect(isTwoHanded(w)).toBe(true);
      const oneHanded = ITEMS.filter((i) => i.slot === 'weapon' && !i.twoHanded && i.level === w.level);
      const bestOne = Math.max(...oneHanded.map((i) => i.damage![0] + i.damage![1]));
      expect(w.damage![0] + w.damage![1]).toBeGreaterThan(bestOne);
    }
  });

  it('щит при двуручнике не надеть и наоборот; prepareEquip освобождает руку', () => {
    const withShield = hero(3, ['tower-shield']);
    expect(handsConflict(withShield, getItem('greatsword'))).toBe('shield');
    const check = canEquip(withShield, getItem('greatsword'));
    expect(check.ok).toBe(false);
    expect(check.reason).toMatch(/щит/i);
    const p = prepareEquip(withShield, getItem('greatsword'));
    expect(p.freed).toEqual(['shield']);
    expect(canEquip(p.character, getItem('greatsword')).ok).toBe(true);

    const withGreat = hero(3, ['greatsword']);
    expect(handsConflict(withGreat, getItem('buckler'))).toBe('weapon');
    expect(canEquip(withGreat, getItem('buckler')).ok).toBe(false);
    expect(prepareEquip(withGreat, getItem('buckler')).freed).toEqual(['weapon']);

    // Одноручное оружие со щитом — без конфликта.
    expect(handsConflict(withShield, getItem('sword'))).toBeNull();
    expect(canEquip(withShield, getItem('sword')).ok).toBe(true);
    // Замена двуручника двуручником: освобождается только слот оружия.
    expect(prepareEquip(withGreat, getItem('poleaxe')).freed).toEqual(['weapon']);
  });

  it('боты не носят щит вместе с двуручником, а кольца и амулеты носят', () => {
    let rings = 0;
    let twoHanded = 0;
    for (let i = 0; i < 300; i += 1) {
      const o = generateOpponent(4, Math.random, new Set(), 1);
      const items = o.itemIds.map(getItem);
      const hasTwo = items.some((it) => it.twoHanded);
      const hasShield = items.some((it) => it.slot === 'shield');
      expect(hasTwo && hasShield).toBe(false);
      if (hasTwo) twoHanded += 1;
      if (items.some((it) => it.slot === 'ring' || it.slot === 'amulet')) rings += 1;
      expect(items.filter((it) => it.slot === 'ring').length).toBeLessThanOrEqual(2);
      expect(items.filter((it) => it.slot === 'amulet').length).toBeLessThanOrEqual(1);
    }
    expect(rings).toBeGreaterThan(0);
    expect(twoHanded).toBeGreaterThan(0);
  });
});

describe('миграция сейва', () => {
  it('старому сейву без ring1/ring2/amulet дописываются пустые слоты', () => {
    const c = newCharacter('Старый');
    const legacy = { ...c.equipment } as Partial<Record<string, string | null>>;
    delete legacy.ring1;
    delete legacy.ring2;
    delete legacy.amulet;
    const raw = { ...c, equipment: legacy } as unknown as Character;
    const fixed = normalizeCharacter(raw);
    for (const s of SLOTS) expect(fixed.equipment[s]).toBeNull();
    for (const s of RING_SLOTS) expect(s in fixed.equipment).toBe(true);
    expect(deriveCharacter(fixed).maxHp).toBe(deriveCharacter(c).maxHp);
  });

  it('щит рядом с двуручником из старого сейва снимается, но остаётся в рюкзаке', () => {
    const c = hero(6, ['halberd']);
    c.backpack.push(newInventoryItem('u-shield', 'buckler'));
    c.equipment.shield = 'u-shield';
    const fixed = normalizeCharacter(c);
    expect(fixed.equipment.weapon).toBe(c.equipment.weapon);
    expect(fixed.equipment.shield).toBeNull();
    expect(fixed.backpack.some((i) => i.uid === 'u-shield')).toBe(true);
  });
});
