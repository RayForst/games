import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';
import { itemOf, SLOT_LABELS, SLOTS, type Character, type Slot } from '@/game';

interface Props {
  character: Character;
  onSlotPress?: (slot: Slot) => void;
}

/** Сетка слотов экипировки — «кукла» персонажа. */
export function PaperDoll({ character, onSlotPress }: Props) {
  return (
    <View style={styles.grid}>
      {SLOTS.map((slot) => {
        const uid = character.equipment[slot];
        const item = uid ? itemOf(uid, character) : null;
        return (
          <Pressable
            key={slot}
            onPress={() => onSlotPress?.(slot)}
            disabled={!item}
            style={({ pressed }) => [styles.slot, item && styles.filled, pressed && styles.pressed]}>
            <Txt variant="small">{SLOT_LABELS[slot]}</Txt>
            <Txt bold={!!item} color={item ? colors.text : colors.textDim} numberOfLines={1}>
              {item ? item.name : 'пусто'}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: {
    width: '48%',
    flexGrow: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    gap: 2,
  },
  filled: { borderColor: colors.goldDim, backgroundColor: colors.cardAlt },
  pressed: { opacity: 0.7 },
});
