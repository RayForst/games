import { Image, StyleSheet, View } from 'react-native';

import { Txt } from './Txt';
import { UI_ICONS } from '@/ui/icons.generated';

interface Props {
  value: number;
  size?: number;
  /** Подпись «кр.» после числа. */
  suffix?: boolean;
}

/** Сумма кредитов с монетой. */
export function Kredits({ value, size = 18, suffix = true }: Props) {
  return (
    <View style={styles.row}>
      <Image source={UI_ICONS.kredit} style={{ width: size, height: size }} resizeMode="contain" />
      <Txt variant="gold" style={{ fontSize: size, lineHeight: Math.round(size * 1.3) }}>
        {value}
        {suffix ? ' кр.' : ''}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
