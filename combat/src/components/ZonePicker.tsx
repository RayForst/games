import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';
import { BLOCKS, BLOCK_ZONES, ZONES, ZONE_LABELS, type Block, type Zone } from '@/game';

interface Props {
  attack: Zone | null;
  block: Block | null;
  onAttack: (z: Zone) => void;
  onBlock: (b: Block) => void;
  disabled?: boolean;
}

const ROW = 46;
const GAP = 6;

/**
 * Выбор зоны удара (5) и блока (4). Кнопки блока стоят «между» зонами,
 * показывая, что каждый блок закрывает две соседние.
 */
export function ZonePicker({ attack, block, onAttack, onBlock, disabled }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.col}>
        <Txt variant="small" center style={styles.colTitle}>
          УДАР
        </Txt>
        {ZONES.map((z) => {
          const active = attack === z;
          return (
            <Pressable
              key={z}
              disabled={disabled}
              onPress={() => onAttack(z)}
              style={[styles.zone, active && styles.zoneActive, disabled && styles.disabled]}>
              <Txt bold={active} color={active ? colors.black : colors.text}>
                {ZONE_LABELS[z]}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.col}>
        <Txt variant="small" center style={styles.colTitle}>
          БЛОК
        </Txt>
        <View style={{ height: ROW / 2 }} />
        {BLOCKS.map((b) => {
          const active = block === b;
          const [z1, z2] = BLOCK_ZONES[b];
          return (
            <Pressable
              key={b}
              disabled={disabled}
              onPress={() => onBlock(b)}
              style={[styles.block, active && styles.blockActive, disabled && styles.disabled]}>
              <Txt variant="small" bold={active} color={active ? colors.black : colors.textMuted} center>
                {ZONE_LABELS[z1]} + {ZONE_LABELS[z2].toLowerCase()}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: spacing.md },
  col: { flex: 1, gap: GAP },
  colTitle: { letterSpacing: 2, marginBottom: 2 },
  zone: {
    height: ROW,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.redDim,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneActive: { backgroundColor: colors.red, borderColor: colors.red },
  block: {
    height: ROW,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  blockActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  disabled: { opacity: 0.5 },
});
