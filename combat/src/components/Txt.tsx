import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts } from '@/ui/theme';

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'small' | 'mono' | 'gold';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
  bold?: boolean;
}

export function Txt({ variant = 'body', color, center, bold, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        styles[variant],
        color ? { color } : null,
        center ? { textAlign: 'center' } : null,
        bold ? { fontWeight: '700' } : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  title: { fontFamily: fonts.title, fontSize: 28, lineHeight: 34, color: colors.gold, fontWeight: '700' },
  heading: { fontFamily: fonts.title, fontSize: 19, lineHeight: 24, color: colors.text, fontWeight: '700' },
  body: {},
  muted: { color: colors.textMuted },
  small: { fontSize: 12, lineHeight: 16, color: colors.textMuted },
  mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18 },
  gold: { color: colors.gold, fontWeight: '600' },
});
