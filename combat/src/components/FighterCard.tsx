import { StyleSheet, View } from 'react-native';

import { Bar } from './Bar';
import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';
import type { DerivedStats } from '@/game';

interface Props {
  name: string;
  level: number;
  hp: number;
  derived: DerivedStats;
  side: 'player' | 'enemy';
}

export function FighterCard({ name, level, hp, derived, side }: Props) {
  const enemy = side === 'enemy';
  return (
    <View style={[styles.card, enemy && styles.enemy]}>
      <View style={styles.row}>
        <Txt variant="heading" numberOfLines={1} style={styles.name}>
          {name}
        </Txt>
        <Txt variant="small">{level} ур.</Txt>
      </View>
      <Bar value={hp} max={derived.maxHp} color={enemy ? colors.purple : colors.red} height={12} />
      <Txt variant="small">
        урон {derived.dmgMin}–{derived.dmgMax} · крит {derived.crit}% · уворот {derived.dodge}%
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  enemy: { borderColor: colors.borderStrong },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  name: { flex: 1 },
});
