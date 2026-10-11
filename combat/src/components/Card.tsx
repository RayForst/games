import { StyleSheet, View, type ViewProps } from 'react-native';

import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';

interface Props extends ViewProps {
  title?: string;
  right?: React.ReactNode;
}

export function Card({ title, right, style, children, ...rest }: Props) {
  return (
    <View {...rest} style={[styles.card, style]}>
      {title ? (
        <View style={styles.header}>
          <Txt variant="heading">{title}</Txt>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
});
