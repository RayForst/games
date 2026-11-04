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
};

/** Цвет заглушек: приглушённая латунь, чтобы не спорить с живописными иконками. */
export const GI_TINT = '#b8945a';
