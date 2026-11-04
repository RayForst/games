import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GiIcon } from './GiIcon';
import { GI_TINT, ITEM_GI, SLOT_GI } from '@/ui/giMap';
import { ITEM_ICONS, UI_ICONS } from '@/ui/icons.generated';
import { colors } from '@/ui/theme';
import type { ItemSlot, Slot } from '@/game';

interface Props {
  /** id предмета из каталога; без него рисуется пустой слот. */
  id?: string | null;
  /** Слот — чтобы пустое оружие показывало кулаки, а не пустую ячейку. */
  slot?: Slot | ItemSlot;
  size?: number;
  /** Без тёмной плитки-подложки, просто картинка. */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Иконка предмета на тёмной плитке. Картинки с прозрачным фоном, подложка даёт им общий вид. */
export function ItemIcon({ id, slot, size = 56, bare, style }: Props) {
  const inner = Math.round(size * 0.86);
  // Своей картинки нет — монохромная заглушка из Game Icons; пустое кольцо/амулет — тусклый силуэт; иначе пустой слот.
  const gi = id ? (ITEM_ICONS[id] ? undefined : ITEM_GI[id]) : slot ? SLOT_GI[slot] : undefined;
  const source = (id && ITEM_ICONS[id]) || (slot === 'weapon' ? UI_ICONS.fists : UI_ICONS['slot-empty']);
  const image = gi ? (
    <GiIcon name={gi} size={Math.round(inner * 0.8)} color={id ? GI_TINT : colors.textDim} />
  ) : (
    <Image source={source} style={{ width: inner, height: inner }} resizeMode="contain" accessibilityIgnoresInvertColors />
  );
  if (bare) return <View style={[{ width: size, height: size }, styles.center, style]}>{image}</View>;
  return (
    <View style={[styles.tile, styles.center, { width: size, height: size, borderRadius: Math.round(size * 0.2) }, style]}>
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  tile: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
});
