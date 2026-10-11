import { Pressable, StyleSheet } from 'react-native';

import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';

interface Props {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function Chip({ label, active, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.active]}>
      <Txt variant="small" color={active ? colors.black : colors.textMuted} bold={active}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardAlt,
  },
  active: { backgroundColor: colors.gold, borderColor: colors.gold },
});
