// Сгенерировано scripts/icons.mjs — не править руками, запускать `npm run icons`.
import type { ImageSourcePropType } from 'react-native';

/** Иконки предметов по id из каталога. */
export const ITEM_ICONS: Record<string, ImageSourcePropType> = {
  'bast-shoes': require('../../assets/items/bast-shoes.webp'),
  'battle-axe': require('../../assets/items/battle-axe.webp'),
  'brigandine': require('../../assets/items/brigandine.webp'),
  'buckler': require('../../assets/items/buckler.webp'),
  'cap': require('../../assets/items/cap.webp'),
  'chain-pants': require('../../assets/items/chain-pants.webp'),
  'chainmail': require('../../assets/items/chainmail.webp'),
  'cloth-pants': require('../../assets/items/cloth-pants.webp'),
  'club': require('../../assets/items/club.webp'),
  'dagger': require('../../assets/items/dagger.webp'),
  'great-helm': require('../../assets/items/great-helm.webp'),
  'hatchet': require('../../assets/items/hatchet.webp'),
  'iron-boots': require('../../assets/items/iron-boots.webp'),
  'iron-gloves': require('../../assets/items/iron-gloves.webp'),
  'iron-helm': require('../../assets/items/iron-helm.webp'),
  'jacket': require('../../assets/items/jacket.webp'),
  'knife': require('../../assets/items/knife.webp'),
  'leather-belt': require('../../assets/items/leather-belt.webp'),
  'leather-boots': require('../../assets/items/leather-boots.webp'),
  'leather-gloves': require('../../assets/items/leather-gloves.webp'),
  'leather-pants': require('../../assets/items/leather-pants.webp'),
  'mace': require('../../assets/items/mace.webp'),
  'plate': require('../../assets/items/plate.webp'),
  'rapier': require('../../assets/items/rapier.webp'),
  'round-shield': require('../../assets/items/round-shield.webp'),
  'short-sword': require('../../assets/items/short-sword.webp'),
  'studded-belt': require('../../assets/items/studded-belt.webp'),
  'studded-gloves': require('../../assets/items/studded-gloves.webp'),
  'sword': require('../../assets/items/sword.webp'),
  'tower-shield': require('../../assets/items/tower-shield.webp'),
  'warrior-belt': require('../../assets/items/warrior-belt.webp'),
};

/** Иконки интерфейса. */
export const UI_ICONS = {
  'exp': require('../../assets/ui/exp.webp') as ImageSourcePropType,
  'fists': require('../../assets/ui/fists.webp') as ImageSourcePropType,
  'hp': require('../../assets/ui/hp.webp') as ImageSourcePropType,
  'kredit': require('../../assets/ui/kredit.webp') as ImageSourcePropType,
  'potion-large': require('../../assets/ui/potion-large.webp') as ImageSourcePropType,
  'potion-medium': require('../../assets/ui/potion-medium.webp') as ImageSourcePropType,
  'potion-small': require('../../assets/ui/potion-small.webp') as ImageSourcePropType,
  'slot-empty': require('../../assets/ui/slot-empty.webp') as ImageSourcePropType,
} as const;

export type UiIconName = keyof typeof UI_ICONS;
