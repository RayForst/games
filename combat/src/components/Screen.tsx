import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/ui/theme';

interface Props extends ViewProps {
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
}

/** Обёртка экрана: safe area, фон, скролл. */
export function Screen({ scroll = true, edges = ['top', 'left', 'right'], padded = true, style, children, ...rest }: Props) {
  const content = padded ? [styles.padded, style] : style;
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, content]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View {...rest} style={[styles.flex, content]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxl },
  padded: { padding: spacing.lg, gap: spacing.md },
});
