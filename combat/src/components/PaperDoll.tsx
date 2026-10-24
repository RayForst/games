import { Pressable, StyleSheet, View } from 'react-native';

import { ItemIcon } from './ItemIcon';
import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';
import { itemOf, SLOT_LABELS, type Character, type ItemDef, type Slot } from '@/game';

interface Props {
  character: Character;
  /** Нажатие на слот: `item` — надетая вещь или null, если слот пуст. */
  onSlotPress?: (slot: Slot, item: ItemDef | null) => void;
  /** Что стоит в центре между колонками — аватар. */
  children?: React.ReactNode;
}

/** Слева — что на теле сверху вниз, справа — что в руках и на поясе/ногах. */
const LEFT: Slot[] = ['helmet', 'armor', 'gloves', 'pants'];
const RIGHT: Slot[] = ['weapon', 'shield', 'belt', 'boots'];

/** «Кукла» персонажа: аватар в центре, слоты экипировки по краям. */
export function PaperDoll({ character, onSlotPress, children }: Props) {
  const column = (slots: Slot[]) => (
    <View style={styles.column}>
      {slots.map((slot) => {
        const uid = character.equipment[slot];
        const item = uid ? itemOf(uid, character) : null;
        return (
          <Pressable
            key={slot}
            onPress={() => onSlotPress?.(slot, item)}
            accessibilityLabel={`${SLOT_LABELS[slot]}: ${item ? item.name : 'пусто'}`}
            style={({ pressed }) => [styles.slot, item && styles.filled, pressed && styles.pressed]}>
            <ItemIcon id={item?.id} slot={slot} size={44} bare style={!item && styles.dim} />
            <Txt variant="small" numberOfLines={1} color={item ? colors.text : colors.textDim} style={styles.label}>
              {item ? item.name : SLOT_LABELS[slot]}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.row}>
      {column(LEFT)}
      <View style={styles.center}>{children}</View>
      {column(RIGHT)}
    </View>
  );
}

const TILE = 74;

const styles = StyleSheet.create({
  // Кукла растягивается на свободную высоту экрана; плитки расходятся по колонке.
  row: { flex: 1, minHeight: TILE * 4 + spacing.sm * 3, flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
  column: { justifyContent: 'space-between', gap: spacing.sm },
  center: { flex: 1 },
  slot: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  filled: { borderColor: colors.goldDim, backgroundColor: colors.cardAlt },
  pressed: { opacity: 0.7 },
  dim: { opacity: 0.45 },
  label: { fontSize: 10, lineHeight: 13, maxWidth: TILE - 8, textAlign: 'center' },
});
