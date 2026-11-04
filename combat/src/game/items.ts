import type { ItemDef, ItemSlot } from './types';

// Каталог предметов. Уровни 0–6, цены в кредитах.
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

  // ─── Уровни 4–6 ───────────────────────────────────────────────────────────
  // Оружие
  { id: 'flail', name: 'Кистень', slot: 'weapon', price: 850, level: 4, damage: [9, 16], requires: { strength: 12 }, bonus: { antiDodge: 4 } },
  { id: 'longsword', name: 'Полуторный меч', slot: 'weapon', price: 950, level: 4, damage: [10, 16], requires: { strength: 13 } },
  { id: 'war-hammer', name: 'Боевой молот', slot: 'weapon', price: 800, level: 5, damage: [12, 20], requires: { strength: 15 }, bonus: { antiDodge: 6 } },
  { id: 'estoc', name: 'Эсток', slot: 'weapon', price: 850, level: 5, damage: [10, 17], requires: { intuition: 10 }, bonus: { crit: 10 } },
  { id: 'halberd', name: 'Алебарда', slot: 'weapon', price: 1300, level: 6, damage: [19, 31], requires: { strength: 19 }, twoHanded: true, bonus: { antiDodge: 4, dodge: -4 }, description: 'Древко в полтора роста. Щит к ней не прилагается.' },
  { id: 'executioner-sword', name: 'Меч палача', slot: 'weapon', price: 1500, level: 6, damage: [15, 25], requires: { strength: 18 }, bonus: { crit: 6 }, description: 'Зазубрен не от боёв.' },
  // Щиты
  { id: 'kite-shield', name: 'Каплевидный щит', slot: 'shield', price: 900, level: 4, requires: { strength: 11 }, bonus: { armor: { head: 2, body: 3, belt: 2, legs: 1 }, dodge: -5 } },
  { id: 'steel-wall', name: 'Стальная стена', slot: 'shield', price: 1200, level: 6, requires: { strength: 16 }, bonus: { armor: { head: 3, body: 4, belt: 3, legs: 3 }, dodge: -8 } },
  // Шлемы
  { id: 'barbute', name: 'Барбют', slot: 'helmet', price: 800, level: 4, requires: { strength: 10 }, bonus: { armor: { head: 6 }, antiCrit: 3 } },
  { id: 'crowned-helm', name: 'Коронованный шлем', slot: 'helmet', price: 1150, level: 6, requires: { strength: 14 }, bonus: { armor: { head: 8 }, stats: { endurance: 2 } } },
  // Броня
  { id: 'scale', name: 'Чешуйчатый доспех', slot: 'armor', price: 1000, level: 4, requires: { strength: 12 }, bonus: { armor: { body: 7 }, hp: 10 } },
  { id: 'gothic-plate', name: 'Готические латы', slot: 'armor', price: 900, level: 5, requires: { strength: 14 }, bonus: { armor: { body: 9 }, hp: 15, dodge: -6 } },
  { id: 'dragon-plate', name: 'Драконья броня', slot: 'armor', price: 1600, level: 6, requires: { strength: 17 }, bonus: { armor: { body: 12 }, hp: 25, dodge: -8, stats: { strength: 1 } }, description: 'Дракона никто не видел. Кузнеца тоже.' },
  // Перчатки, пояс, штаны, сапоги
  { id: 'knight-gauntlets', name: 'Рыцарские перчатки', slot: 'gloves', price: 700, level: 5, bonus: { stats: { strength: 3 }, antiCrit: 5 } },
  { id: 'champion-belt', name: 'Пояс чемпиона', slot: 'belt', price: 750, level: 5, bonus: { armor: { belt: 6 }, stats: { endurance: 2, strength: 1 } } },
  { id: 'plate-legs', name: 'Латные поножи', slot: 'pants', price: 650, level: 5, requires: { strength: 12 }, bonus: { armor: { legs: 6 } } },
  { id: 'dragon-legs', name: 'Драконьи поножи', slot: 'pants', price: 1250, level: 6, requires: { strength: 15 }, bonus: { armor: { legs: 8 }, stats: { endurance: 1 } } },
  { id: 'knight-sabatons', name: 'Рыцарские сабатоны', slot: 'boots', price: 600, level: 5, bonus: { armor: { legs: 5 }, stats: { endurance: 1 }, dodge: 2 } },

  // ─── Двуручное оружие ─────────────────────────────────────────────────────
  // Урон на треть выше одноручного того же уровня, но щит не надеть; тяжёлое — минус к увороту.
  { id: 'wagon-shaft', name: 'Оглобля', slot: 'weapon', price: 120, level: 1, damage: [7, 12], requires: { strength: 8 }, twoHanded: true, bonus: { dodge: -2 }, description: 'Сняли с телеги. Телега не возражала.' },
  { id: 'poleaxe', name: 'Секира', slot: 'weapon', price: 330, level: 2, damage: [8, 14], requires: { strength: 10 }, twoHanded: true, bonus: { crit: 3, dodge: -2 } },
  { id: 'greatsword', name: 'Двуручный меч', slot: 'weapon', price: 650, level: 3, damage: [11, 18], requires: { strength: 13 }, twoHanded: true, bonus: { antiDodge: 3, dodge: -3 } },
  { id: 'bardiche', name: 'Бердыш', slot: 'weapon', price: 1100, level: 4, damage: [13, 22], requires: { strength: 15 }, twoHanded: true, bonus: { crit: 4, dodge: -3 } },
  { id: 'maul', name: 'Кувалда', slot: 'weapon', price: 1000, level: 5, damage: [16, 26], requires: { strength: 18 }, twoHanded: true, bonus: { antiDodge: 6, dodge: -4 }, description: 'Кузнец Макар сделал, кузнец Макар предупреждал.' },

  // ─── Кольца ───────────────────────────────────────────────────────────────
  // Два слота, одинаковые можно. Прибавки маленькие, но складываются; цены — около 60 % от вещи того же уровня.
  { id: 'copper-ring', name: 'Медное кольцо', slot: 'ring', price: 25, level: 0, bonus: { hp: 3 } },
  { id: 'bone-ring', name: 'Костяное кольцо', slot: 'ring', price: 30, level: 0, bonus: { crit: 2 }, description: 'Чья кость — не спрашивай.' },
  { id: 'iron-ring', name: 'Железное кольцо', slot: 'ring', price: 90, level: 1, bonus: { stats: { strength: 1 } } },
  { id: 'silver-ring', name: 'Серебряное кольцо', slot: 'ring', price: 100, level: 1, bonus: { stats: { intuition: 1 } } },
  { id: 'onyx-ring', name: 'Кольцо с ониксом', slot: 'ring', price: 220, level: 2, bonus: { stats: { dexterity: 1 }, dodge: 2 } },
  { id: 'garnet-ring', name: 'Кольцо с гранатом', slot: 'ring', price: 240, level: 2, bonus: { stats: { strength: 1 }, crit: 2 } },
  { id: 'drowned-ring', name: 'Кольцо утопленника', slot: 'ring', price: 380, level: 3, bonus: { stats: { endurance: 1 }, hp: 6, antiCrit: 2 }, description: 'С пальца не снималось. Пришлось с пальцем.' },
  { id: 'headsman-ring', name: 'Перстень палача', slot: 'ring', price: 420, level: 3, bonus: { crit: 5, antiDodge: 3 } },
  { id: 'prince-ring', name: 'Княжий перстень', slot: 'ring', price: 600, level: 4, bonus: { stats: { strength: 1, intuition: 1 }, crit: 3 } },
  { id: 'host-ring', name: 'Перстень Хозяина', slot: 'ring', price: 700, level: 5, bonus: { stats: { strength: 2, endurance: 1 }, antiCrit: 4 }, description: 'Таких несколько. Хозяин раздаёт их тем, кто дожил.' },
  { id: 'dragon-ring', name: 'Кольцо дракона', slot: 'ring', price: 950, level: 6, bonus: { stats: { strength: 1, intuition: 2 }, crit: 6, antiDodge: 4 } },

  // ─── Амулеты ──────────────────────────────────────────────────────────────
  { id: 'wolf-fang', name: 'Волчий клык', slot: 'amulet', price: 30, level: 0, bonus: { crit: 2, antiDodge: 1 } },
  { id: 'ladanka', name: 'Ладанка', slot: 'amulet', price: 90, level: 1, bonus: { hp: 5, antiCrit: 2 }, description: 'Внутри что-то шуршит. Лучше не открывать.' },
  { id: 'evil-eye-charm', name: 'Оберег от сглаза', slot: 'amulet', price: 240, level: 2, bonus: { dodge: 4, antiCrit: 3 } },
  { id: 'veteran-medallion', name: 'Медальон ветерана', slot: 'amulet', price: 400, level: 3, bonus: { stats: { strength: 1, endurance: 1 }, hp: 5 } },
  { id: 'tooth-necklace', name: 'Ожерелье из зубов', slot: 'amulet', price: 650, level: 4, bonus: { stats: { intuition: 2 }, crit: 5, antiDodge: 3 }, description: 'Зубы человеческие. Разные.' },
  { id: 'host-amulet', name: 'Амулет Хозяина', slot: 'amulet', price: 1100, level: 6, bonus: { stats: { strength: 1, endurance: 2 }, hp: 15, antiCrit: 5 } },
];

export const ITEMS_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

export function getItem(id: string): ItemDef {
  const item = ITEMS_BY_ID[id];
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

export function itemsForSlot(slot: ItemSlot): ItemDef[] {
  return ITEMS.filter((i) => i.slot === slot);
}

/** Двуручное оружие и щит вместе не носятся. */
export function isTwoHanded(item: ItemDef | null | undefined): boolean {
  return !!item?.twoHanded;
}

/** Цена продажи — половина стоимости, заточка добавляет по 15 % за уровень. */
export function sellPrice(item: ItemDef, upgrade = 0): number {
  return Math.floor((item.price * (1 + 0.15 * upgrade)) / 2);
}

// ─── Кузница ────────────────────────────────────────────────────────────────

export const UPGRADE_MAX = 3;

const DURABILITY_BY_SLOT: Record<ItemSlot, number> = {
  weapon: 40,
  shield: 50,
  helmet: 50,
  armor: 60,
  gloves: 40,
  belt: 40,
  pants: 50,
  boots: 50,
  ring: 60,
  amulet: 60,
};

/** Полная прочность вещи: по слоту, дорогие вещи крепче. */
export function maxDurability(item: ItemDef): number {
  return DURABILITY_BY_SLOT[item.slot] + item.level * 10;
}

/** Доля цены вещи за полный износ. */
export const REPAIR_SHARE = 0.15;

/** Ремонт: доля цены за полный износ, пропорционально недостающему, не меньше 1 кр. */
export function repairCost(item: ItemDef, durability: number): number {
  const max = maxDurability(item);
  const missing = Math.max(0, max - durability);
  if (missing === 0) return 0;
  return Math.max(1, Math.ceil((item.price * REPAIR_SHARE * missing) / max));
}

/** Точить можно оружие и всё, что даёт броню. Перчатки с бонусом к статам — нет. */
export function canUpgrade(item: ItemDef): boolean {
  if (item.damage) return true;
  const armor = item.bonus?.armor;
  return !!armor && Object.values(armor).some((v) => (v ?? 0) > 0);
}

/** Заточка до уровня `next` (1..3): 60 % цены за первый уровень, дальше дороже. */
export function upgradeCost(item: ItemDef, next: number): number {
  return Math.max(2, Math.ceil(item.price * 0.6 * next));
}

/** Имя с заточкой: «Меч +2». */
export function itemDisplayName(item: ItemDef, upgrade = 0): string {
  return upgrade > 0 ? `${item.name} +${upgrade}` : item.name;
}
