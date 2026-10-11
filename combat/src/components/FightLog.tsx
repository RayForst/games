import { StyleSheet, View } from 'react-native';

import { Txt } from './Txt';
import { colors, outcomeColors, radius, spacing } from '@/ui/theme';
import type { LogLine } from '@/game';

interface Props {
  log: LogLine[];
  limit?: number;
}

/** Лог боя, последние события сверху. */
export function FightLog({ log, limit = 40 }: Props) {
  const lines = log.slice(-limit).reverse();
  return (
    <View style={styles.wrap}>
      {lines.map((l) => (
        <View key={l.id} style={[styles.line, l.kind === 'system' && styles.system]}>
          {l.kind !== 'system' ? (
            <Txt variant="small" style={styles.turn}>
              {l.turn}
            </Txt>
          ) : null}
          <Txt
            style={styles.text}
            color={l.kind === 'system' ? colors.gold : l.outcome ? outcomeColors[l.outcome] : colors.text}
            bold={l.kind === 'system' || l.outcome === 'crit' || l.outcome === 'crit-through-block'}>
            {l.text}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  line: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  system: { backgroundColor: colors.bgElevated, marginVertical: 2 },
  turn: { width: 22, textAlign: 'right', color: colors.textDim, fontVariant: ['tabular-nums'] },
  text: { flex: 1, fontSize: 14, lineHeight: 19 },
});
