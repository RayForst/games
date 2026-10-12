import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { colors, radius } from '@/ui/theme';

interface Props {
  /** Доля здоровья 0..1 — раненый силуэт темнеет и краснеет. */
  hpRatio: number;
}

/**
 * Заглушка аватара: пьедестал под лучом света и силуэт бойца.
 * Сюда потом встанет сгенерированный портрет (см. план по графике в CLAUDE.md).
 */
export function Avatar({ hpRatio }: Props) {
  // Медленное «дыхание», чтобы персонаж выглядел живым, а не иконкой.
  const [breath] = useState(() => new Animated.Value(0));
  // Фигура растёт вместе с рамкой: на большом экране кукла высокая, силуэт не должен теряться внизу.
  const [box, setBox] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  };
  // Силуэт узкий (примерно 0.4 ширины от высоты), поэтому по ширине можно брать с запасом.
  const size = Math.round(Math.min(Math.max(box.height * 0.8, 140), box.width * 1.7, 380));

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

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const wounded = hpRatio < 0.35;
  const tint = wounded ? colors.redDim : colors.textDim;

  return (
    <View style={styles.frame} onLayout={onLayout}>
      <View style={styles.lightOuter} />
      <View style={styles.lightInner} />
      <View style={[styles.floor, { width: size * 0.38, height: size * 0.06 }]} />
      <Animated.View style={[styles.figure, { transform: [{ scale }] }]}>
        <MaterialCommunityIcons name="human-male" size={size} color={tint} />
      </Animated.View>
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
    paddingBottom: 18,
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
  // Тень под ногами — фигура стоит, а не висит.
  floor: {
    position: 'absolute',
    bottom: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.black,
    opacity: 0.45,
  },
  figure: { alignItems: 'center', justifyContent: 'flex-end' },
});
