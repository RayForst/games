import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { colors, radius, spacing } from '@/ui/theme';

/** Поле ввода в палитре клуба: тёмное, с латунной рамкой. */
export function Input({ style, ...rest }: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textDim} autoCorrect={false} {...rest} style={[styles.input, style]} />;
}

const styles = StyleSheet.create({
  input: {
    color: colors.text,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
  },
});
