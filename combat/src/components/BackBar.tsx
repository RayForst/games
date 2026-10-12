import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from './Txt';
import { colors, spacing } from '@/ui/theme';

interface Props {
  /** Куда ведёт кнопка, по умолчанию «Город». */
  title?: string;
  right?: React.ReactNode;
}

/** Верхняя полоска экранов, открытых с карты: назад в город + что-нибудь справа (например, кредиты). */
export function BackBar({ title = 'Город', right }: Props) {
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/(tabs)/city');
  };
  return (
    <View style={styles.row}>
      <Pressable onPress={back} accessibilityRole="button" accessibilityLabel={`Назад: ${title}`} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Ionicons name="chevron-back" size={20} color={colors.gold} />
        <Txt variant="gold">{title}</Txt>
      </Pressable>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.xs },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4, paddingRight: spacing.sm },
  pressed: { opacity: 0.7 },
});
