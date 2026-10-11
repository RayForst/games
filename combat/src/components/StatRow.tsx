import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';

interface Props {
  label: string;
  value: number;
  bonus?: number;
  hint?: string;
  onPlus?: () => void;
}

export function StatRow({ label, value, bonus = 0, hint, onPlus }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.labelCol}>
        <Txt>{label}</Txt>
        {hint ? <Txt variant="small">{hint}</Txt> : null}
      </View>
      <Txt bold style={styles.value}>
        {value}
        {bonus !== 0 ? (
          <Txt color={bonus > 0 ? colors.green : colors.red} bold>
            {bonus > 0 ? ` +${bonus}` : ` ${bonus}`}
          </Txt>
        ) : null}
      </Txt>
      {onPlus ? (
        <Pressable onPress={onPlus} style={({ pressed }) => [styles.plus, pressed && styles.plusPressed]}>
          <Txt bold color={colors.black} style={styles.plusText}>
            +
          </Txt>
        </Pressable>
      ) : (
        <View style={styles.plusSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 4 },
  labelCol: { flex: 1 },
  value: { minWidth: 56, textAlign: 'right', fontSize: 17, fontVariant: ['tabular-nums'] },
  plus: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusPressed: { opacity: 0.7 },
  plusText: { fontSize: 20, lineHeight: 24 },
  plusSpacer: { width: 34 },
});
