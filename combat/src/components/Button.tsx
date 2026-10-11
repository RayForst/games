import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

const bg: Record<Variant, string> = {
  primary: colors.gold,
  secondary: colors.cardAlt,
  danger: colors.red,
  ghost: 'transparent',
};

const fg: Record<Variant, string> = {
  primary: colors.black,
  secondary: colors.text,
  danger: colors.white,
  ghost: colors.gold,
};

export function Button({ title, onPress, variant = 'primary', disabled, small, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: bg[variant] },
        variant === 'secondary' && styles.secondaryBorder,
        variant === 'ghost' && styles.ghostBorder,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Txt bold center color={fg[variant]} style={small ? styles.smallText : styles.text}>
        {title}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { paddingVertical: 7, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  text: { fontSize: 16, lineHeight: 20 },
  smallText: { fontSize: 13, lineHeight: 16 },
  secondaryBorder: { borderWidth: 1, borderColor: colors.borderStrong },
  ghostBorder: { borderWidth: 1, borderColor: colors.goldDim },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
});
