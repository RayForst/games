import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Txt } from './Txt';
import { colors, radius } from '@/ui/theme';

interface Props {
  value: number;
  max: number;
  color?: string;
  label?: string;
  height?: number;
  showNumbers?: boolean;
}

/** Полоска hp/опыта с плавной анимацией. */
export function Bar({ value, max, color = colors.red, label, height = 14, showNumbers = true }: Props) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  // Animated.Value создаём один раз; useState с инициализатором вместо useRef — так хочет react-hooks/refs.
  const [anim] = useState(() => new Animated.Value(ratio));

  useEffect(() => {
    Animated.timing(anim, { toValue: ratio, duration: 350, useNativeDriver: false }).start();
  }, [ratio, anim]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.wrap}>
      {label || showNumbers ? (
        <View style={styles.row}>
          {label ? <Txt variant="small">{label}</Txt> : <View />}
          {showNumbers ? (
            <Txt variant="small" style={styles.numbers}>
              {Math.round(value)}/{Math.round(max)}
            </Txt>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.track, { height }]}>
        <Animated.View style={[styles.fill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  numbers: { color: colors.text, fontVariant: ['tabular-nums'] },
  track: {
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
});
