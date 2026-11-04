import type { GiName } from './gi.generated';

/** Предметы без своей картинки → иконка-заглушка из Game Icons. Убирать строку, когда появляется файл в art/icons-src. */
export const ITEM_GI: Partial<Record<string, GiName>> = {
  flail: 'flail',
  longsword: 'longsword',
  'war-hammer': 'war-hammer',
  estoc: 'estoc',
  halberd: 'halberd',
  'executioner-sword': 'executioner-sword',
  'kite-shield': 'kite-shield',
  'steel-wall': 'steel-wall',
  barbute: 'barbute',
  'crowned-helm': 'crowned-helm',
  scale: 'scale',
  'gothic-plate': 'gothic-plate',
  'dragon-plate': 'dragon-plate',
  'knight-gauntlets': 'knight-gauntlets',
  'champion-belt': 'champion-belt',
  'plate-legs': 'plate-legs',
  'dragon-legs': 'dragon-legs',
  'knight-sabatons': 'knight-sabatons',
  'wagon-shaft': 'wagon-shaft',
  poleaxe: 'poleaxe',
  greatsword: 'greatsword',
  bardiche: 'bardiche',
  maul: 'maul',
  'copper-ring': 'copper-ring',
  'bone-ring': 'bone-ring',
  'iron-ring': 'iron-ring',
  'silver-ring': 'silver-ring',
  'onyx-ring': 'onyx-ring',
  'garnet-ring': 'garnet-ring',
  'drowned-ring': 'drowned-ring',
  'headsman-ring': 'headsman-ring',
  'prince-ring': 'prince-ring',
  'host-ring': 'host-ring',
  'dragon-ring': 'dragon-ring',
  'wolf-fang': 'wolf-fang',
  ladanka: 'ladanka',
  'evil-eye-charm': 'evil-eye-charm',
  'veteran-medallion': 'veteran-medallion',
  'tooth-necklace': 'tooth-necklace',
  'host-amulet': 'host-amulet',
};

/** Пустые слоты колец и амулета на кукле: силуэт вместо общей заглушки. */
export const SLOT_GI: Partial<Record<string, GiName>> = { ring1: 'slot-ring', ring2: 'slot-ring', amulet: 'slot-amulet', ring: 'slot-ring' };

/** Цвет заглушек: приглушённая латунь, чтобы не спорить с живописными иконками. */
export const GI_TINT = '#b8945a';
