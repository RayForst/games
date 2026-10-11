import type { ItemDef, Slot } from './types';

// Каталог предметов. Уровни 0–3, цены в кредитах.
// Логика бонусов: сила → урон, ловкость → уворот/антикрит, интуиция → крит/антиуворот, выносливость → hp.

export const ITEMS: ItemDef[] = [
  // ─── Оружие ───────────────────────────────────────────────────────────────
  { id: 'knife', name: 'Нож', slot: 'weapon', price: 15, level: 0, damage: [2, 4], description: 'Ржавый, но режет.' },
  { id: 'club', name: 'Дубина', slot: 'weapon', price: 30, level: 0, damage: [3, 6], requires: { strength: 4 } },
  { id: 'dagger', name: 'Кинжал', slot: 'weapon', price: 100, level: 1, damage: [3, 6], requires: { dexterity: 5 }, bonus: { crit: 5 } },
  { id: 'short-sword', name: 'Короткий меч', slot: 'weapon', price: 80, level: 1, damage: [4, 7], requires: { strength: 5 } },
  { id: 'hatchet', name: 'Топорик', slot: 'weapon', price: 110, level: 1, damage: [5, 9], requires: { strength: 7 } },
  { id: 'rapier', name: 'Рапира', slot: 'weapon', price: 280, level: 2, damage: [5, 9], requires: { intuition: 6 }, bonus: { crit: 8, antiDodge: 5 } },
  { id: 'sword', name: 'Меч', slot: 'weapon', price: 250, level: 2, damage: [6, 11], requires: { strength: 8 } },
  { id: 'mace', name: 'Булава', slot: 'weapon', price: 420, level: 3, damage: [7, 12], requires: { strength: 10 }, bonus: { antiDodge: 4 } },
  { id: 'battle-axe', name: 'Боевой топор', slot: 'weapon', price: 500, level: 3, damage: [8, 14], requires: { strength: 11 } },

  // ─── Щиты ─────────────────────────────────────────────────────────────────
  { id: 'buckler', name: 'Баклер', slot: 'shield', price: 40, level: 0, bonus: { armor: { head: 1, body: 1 } } },
  { id: 'round-shield', name: 'Круглый щит', slot: 'shield', price: 200, level: 2, requires: { strength: 6 }, bonus: { armor: { head: 2, body: 2, belt: 1 }, dodge: -3 } },
  { id: 'tower-shield', name: 'Башенный щит', slot: 'shield', price: 480, level: 3, requires: { strength: 9 }, bonus: { armor: { head: 3, body: 3, belt: 2, legs: 1 }, dodge: -6 } },

  // ─── Шлемы ────────────────────────────────────────────────────────────────
  { id: 'cap', name: 'Кожаная шапка', slot: 'helmet', price: 20, level: 0, bonus: { armor: { head: 1 } } },
  { id: 'iron-helm', name: 'Железный шлем', slot: 'helmet', price: 90, level: 1, bonus: { armor: { head: 3 } } },
  { id: 'great-helm', name: 'Рыцарский шлем', slot: 'helmet', price: 350, level: 3, requires: { strength: 8 }, bonus: { armor: { head: 5 }, stats: { endurance: 1 } } },

  // ─── Броня ────────────────────────────────────────────────────────────────
  { id: 'jacket', name: 'Кожаная куртка', slot: 'armor', price: 30, level: 0, bonus: { armor: { body: 1 } } },
  { id: 'chainmail', name: 'Кольчуга', slot: 'armor', price: 150, level: 1, requires: { strength: 5 }, bonus: { armor: { body: 3 } } },
  { id: 'brigandine', name: 'Бригантина', slot: 'armor', price: 320, level: 2, requires: { strength: 7 }, bonus: { armor: { body: 4 }, hp: 5 } },
  { id: 'plate', name: 'Латы', slot: 'armor', price: 600, level: 3, requires: { strength: 10 }, bonus: { armor: { body: 6 }, hp: 10, dodge: -5 } },

  // ─── Перчатки ─────────────────────────────────────────────────────────────
  { id: 'leather-gloves', name: 'Кожаные перчатки', slot: 'gloves', price: 25, level: 0, bonus: { stats: { dexterity: 1 } } },
  { id: 'studded-gloves', name: 'Перчатки с шипами', slot: 'gloves', price: 120, level: 1, bonus: { stats: { strength: 1 }, crit: 2 } },
  { id: 'iron-gloves', name: 'Железные перчатки', slot: 'gloves', price: 260, level: 2, bonus: { stats: { strength: 2 }, antiCrit: 3 } },

  // ─── Пояса ────────────────────────────────────────────────────────────────
  { id: 'leather-belt', name: 'Кожаный пояс', slot: 'belt', price: 20, level: 0, bonus: { armor: { belt: 1 } } },
  { id: 'studded-belt', name: 'Пояс с бляхами', slot: 'belt', price: 140, level: 2, bonus: { armor: { belt: 3 }, stats: { endurance: 1 } } },
  { id: 'warrior-belt', name: 'Пояс воина', slot: 'belt', price: 300, level: 3, bonus: { armor: { belt: 4 }, stats: { strength: 1, endurance: 1 } } },

  // ─── Штаны ────────────────────────────────────────────────────────────────
  { id: 'cloth-pants', name: 'Холщовые штаны', slot: 'pants', price: 20, level: 0, bonus: { armor: { legs: 1 } } },
  { id: 'leather-pants', name: 'Кожаные штаны', slot: 'pants', price: 90, level: 1, bonus: { armor: { legs: 2 }, stats: { dexterity: 1 } } },
  { id: 'chain-pants', name: 'Кольчужные штаны', slot: 'pants', price: 300, level: 3, requires: { strength: 7 }, bonus: { armor: { legs: 4 } } },

  // ─── Сапоги ───────────────────────────────────────────────────────────────
  { id: 'bast-shoes', name: 'Лапти', slot: 'boots', price: 15, level: 0, bonus: { armor: { legs: 1 } } },
  { id: 'leather-boots', name: 'Сапоги', slot: 'boots', price: 80, level: 1, bonus: { armor: { legs: 2 }, dodge: 2 } },
  { id: 'iron-boots', name: 'Латные сапоги', slot: 'boots', price: 260, level: 3, bonus: { armor: { legs: 3 }, stats: { endurance: 1 } } },
];

export const ITEMS_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): ItemDef {
  const item = ITEMS_BY_ID[id];
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

export function itemsForSlot(slot: Slot): ItemDef[] {
  return ITEMS.filter((i) => i.slot === slot);
}

/** Цена продажи — половина стоимости. */
export function sellPrice(item: ItemDef): number {
  return Math.floor(item.price / 2);
}
