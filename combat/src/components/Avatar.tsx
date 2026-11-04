import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Portrait } from './Portrait';
import { colors, radius } from '@/ui/theme';

interface Props {
  /** Сид портрета — имя персонажа. */
  seed: string;
  /** Доля здоровья 0..1 — раненый бледнеет и уходит в тень. */
  hpRatio: number;
  /** Активная травма — повязка через лоб. */
  injured?: boolean;
}

/**
 * Аватар персонажа: пьедестал под лучом света и процедурный портрет (голова и плечи).
 * Портрет собирается из черт по имени (`ui/portrait.ts`), картинок нет.
 */
export function Avatar({ seed, hpRatio, injured }: Props) {
  // Медленное «дыхание», чтобы персонаж выглядел живым, а не иконкой.
  const [breath] = useState(() => new Animated.Value(0));
  // Портрет растёт вместе с рамкой: на большом экране кукла высокая, бюст не должен теряться внизу.
  const [box, setBox] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  };
  // Бюст чуть выше, чем шире (110/100); упираемся в то, что меньше.
  const size = Math.round(Math.min(Math.max(box.height * 0.82, 120), box.width * 0.96, 340));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(breath, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });

  return (
    <View style={styles.frame} onLayout={onLayout}>
      <View style={styles.lightOuter} />
      <View style={styles.lightInner} />
      <View style={[styles.floor, { width: size * 0.7, height: size * 0.08 }]} />
      {box.width > 0 ? (
        <Animated.View style={[styles.figure, { transform: [{ scale }] }]}>
          <Portrait seed={seed} size={size} hpRatio={hpRatio} injured={injured} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  // «Луч света» сверху — два мягких круга за фигурой, без градиентов.
  lightOuter: {
    position: 'absolute',
    top: -120,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.cardAlt,
    opacity: 0.45,
  },
  lightInner: {
    position: 'absolute',
    top: -90,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: colors.cardAlt,
    opacity: 0.6,
  },
  // Тень у основания — бюст стоит, а не висит.
  floor: {
    position: 'absolute',
    bottom: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    opacity: 0.45,
  },
  figure: { alignItems: 'center', justifyContent: 'flex-end', marginBottom: -2 },
});
