import { StyleSheet, View } from 'react-native';

import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';

export function Flash({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <View style={styles.wrap}>
      <Txt center color={colors.black} bold>
        {text}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
});
