import { Pressable, StyleSheet, View } from 'react-native';

import { ItemIcon } from './ItemIcon';
import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';
import { itemDisplayName, itemOf, SLOT_LABELS, type Character, type ItemDef, type Slot } from '@/game';

interface Props {
  character: Character;
  /** Нажатие на слот: `item` — надетая вещь или null, если слот пуст. */
  onSlotPress?: (slot: Slot, item: ItemDef | null) => void;
  /** Что стоит в центре между колонками — аватар. */
  children?: React.ReactNode;
}

/** Ряд колонки: одна плитка или пара половинок (кольца). */
type Row = Slot | [Slot, Slot];

/** Слева — что на теле сверху вниз (амулет на шее под шлемом), справа — руки, пояс, ноги и два кольца. */
const LEFT: Row[] = ['helmet', 'amulet', 'armor', 'gloves', 'pants'];
const RIGHT: Row[] = ['weapon', 'shield', 'belt', 'boots', ['ring1', 'ring2']];

/** «Кукла» персонажа: аватар в центре, слоты экипировки по краям. */
export function PaperDoll({ character, onSlotPress, children }: Props) {
  const tile = (slot: Slot, half = false) => {
    const uid = character.equipment[slot];
    const item = uid ? itemOf(uid, character) : null;
    const upgrade = uid ? character.backpack.find((i) => i.uid === uid)?.upgrade : undefined;
    return (
      <Pressable
        key={slot}
        onPress={() => onSlotPress?.(slot, item)}
        accessibilityLabel={`${SLOT_LABELS[slot]}: ${item ? item.name : 'пусто'}`}
        style={({ pressed }) => [styles.slot, half && styles.half, item && styles.filled, pressed && styles.pressed]}>
        <ItemIcon id={item?.id} slot={slot} size={half ? 30 : 44} bare style={!item && styles.dim} />
        <Txt variant="small" numberOfLines={1} color={item ? colors.text : colors.textDim} style={[styles.label, half && styles.halfLabel]}>
          {item ? itemDisplayName(item, upgrade) : SLOT_LABELS[slot]}
        </Txt>
      </Pressable>
    );
  };

  const column = (rows: Row[]) => (
    <View style={styles.column}>
      {rows.map((row) =>
        typeof row === 'string' ? (
          tile(row)
        ) : (
          <View key={row.join('-')} style={styles.pair}>
            {row.map((slot) => tile(slot, true))}
          </View>
        ),
      )}
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

const TILE = 68;
const ROWS = 5;

const styles = StyleSheet.create({
  // Кукла растягивается на свободную высоту экрана; плитки расходятся по колонке.
  row: { flex: 1, minHeight: TILE * ROWS + spacing.sm * (ROWS - 1), flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' },
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
  pair: { flexDirection: 'row', gap: 4, width: TILE },
  half: { width: (TILE - 4) / 2, paddingHorizontal: 2 },
  filled: { borderColor: colors.goldDim, backgroundColor: colors.cardAlt },
  pressed: { opacity: 0.7 },
  dim: { opacity: 0.45 },
  label: { fontSize: 10, lineHeight: 13, maxWidth: TILE - 8, textAlign: 'center' },
  halfLabel: { fontSize: 8, lineHeight: 10, maxWidth: (TILE - 4) / 2 - 4 },
});
