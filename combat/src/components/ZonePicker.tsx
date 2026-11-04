import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';
import { BLOCKS, BLOCK_ZONES, ZONES, ZONE_LABELS, type Block, type Zone } from '@/game';

interface Props {
  attack: Zone | null;
  block: Block | null;
  onAttack: (z: Zone) => void;
  onBlock: (b: Block) => void;
  disabled?: boolean;
  /** Обучение: какой столбец подсветить пульсирующей рамкой. */
  highlight?: 'attack' | 'block' | null;
}

const ROW = 54;
const GAP = 6;

/**
 * Выбор зоны удара (5) и блока (4). Кнопки блока стоят «между» зонами,
 * показывая, что каждый блок закрывает две соседние. Плитки крупные — под большой палец.
 */
export function ZonePicker({ attack, block, onAttack, onBlock, disabled, highlight }: Props) {
  // Пульс подсказки: одна Animated.Value на оба столбца, крутится только пока есть что подсвечивать.
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!highlight) return;
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [highlight, pulse]);

  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });

  return (
    <View style={styles.wrap}>
      <View style={[styles.col, highlight === 'attack' && styles.hinted]}>
        {highlight === 'attack' ? <Animated.View pointerEvents="none" style={[styles.hintBorder, { opacity: glow }]} /> : null}
        <Txt variant="small" center style={[styles.colTitle, highlight === 'attack' && styles.colTitleHinted]}>
          УДАР
        </Txt>
        {ZONES.map((z) => {
          const active = attack === z;
          return (
            <Pressable
              key={z}
              disabled={disabled}
              onPress={() => onAttack(z)}
              accessibilityRole="button"
              accessibilityLabel={`Удар: ${ZONE_LABELS[z]}`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.zone, active && styles.zoneActive, pressed && styles.pressed, disabled && styles.disabled]}>
              <Txt bold={active} color={active ? colors.white : colors.text} style={styles.label}>
                {ZONE_LABELS[z]}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.col, highlight === 'block' && styles.hinted]}>
        {highlight === 'block' ? <Animated.View pointerEvents="none" style={[styles.hintBorder, { opacity: glow }]} /> : null}
        <Txt variant="small" center style={[styles.colTitle, highlight === 'block' && styles.colTitleHinted]}>
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
              accessibilityRole="button"
              accessibilityLabel={`Блок: ${ZONE_LABELS[z1]} и ${ZONE_LABELS[z2].toLowerCase()}`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.block, active && styles.blockActive, pressed && styles.pressed, disabled && styles.disabled]}>
              <Txt variant="small" bold={active} color={active ? colors.white : colors.textMuted} center style={styles.blockLabel}>
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
  col: { flex: 1, gap: GAP, borderRadius: radius.md },
  hinted: { padding: 4, margin: -4 },
  hintBorder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.gold },
  colTitle: { letterSpacing: 2, marginBottom: 2 },
  colTitleHinted: { color: colors.gold },
  zone: {
    height: ROW,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.redDim,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneActive: { backgroundColor: colors.red, borderColor: colors.gold, borderWidth: 2, transform: [{ scale: 1.04 }] },
  label: { fontSize: 17 },
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
  blockLabel: { fontSize: 13, lineHeight: 16 },
  blockActive: { backgroundColor: colors.blue, borderColor: colors.gold, borderWidth: 2, transform: [{ scale: 1.04 }] },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
