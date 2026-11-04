import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Portrait } from './Portrait';
import type { RaceId } from '@/game/races';
import { colors, radius } from '@/ui/theme';
import type { CosmeticDef } from '@/game';

interface Props {
  /** Сид портрета — имя персонажа. */
  seed: string;
  /** Доля здоровья 0..1 — раненый бледнеет и уходит в тень. */
  hpRatio: number;
  /** Активная травма — повязка через лоб. */
  injured?: boolean;
  /** Раса персонажа — черты лица в портрете. */
  race?: RaceId;
  /** Рамка из Лавки князя (косметика), null — обычная. */
  frame?: CosmeticDef | null;
  /** Фон карточки из Лавки князя, null — обычный. */
  cardBg?: CosmeticDef | null;
}

/**
 * Аватар персонажа: пьедестал под лучом света и процедурный портрет (голова и плечи).
 * Портрет собирается из черт по имени (`ui/portrait.ts`), картинок нет.
 * Косметика — обёртка вокруг: рамка и фон, сам `Portrait` не трогаем.
 */
export function Avatar({ seed, hpRatio, injured, race, frame, cardBg }: Props) {
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

  const frameColor = frame?.color ?? colors.borderStrong;
  const frameWidth = frame ? (frame.frameStyle === 'plain' ? 2 : 3) : 1;

  return (
    <View
      style={[styles.frame, { borderColor: frameColor, borderWidth: frameWidth }, cardBg?.color ? { backgroundColor: cardBg.color } : null]}
      onLayout={onLayout}
      testID="avatar"
      accessibilityLabel={frame ? `Портрет в рамке «${frame.name}»` : 'Портрет'}>
      <View style={[styles.lightOuter, cardBg?.accent ? { backgroundColor: cardBg.accent } : null]} />
      <View style={[styles.lightInner, cardBg?.accent ? { backgroundColor: cardBg.accent } : null]} />
      <View style={[styles.floor, { width: size * 0.7, height: size * 0.08 }]} />
      {box.width > 0 ? (
        <Animated.View style={[styles.figure, { transform: [{ scale }] }]}>
          <Portrait seed={seed} race={race} size={size} hpRatio={hpRatio} injured={injured} />
        </Animated.View>
      ) : null}
      {frame ? <FrameOrnament frame={frame} /> : null}
    </View>
  );
}

/** Украшение рамки поверх портрета: вторая линия и уголки. Не ловит нажатия. */
export function FrameOrnament({ frame, inset = 4 }: { frame: CosmeticDef; inset?: number }) {
  const accent = frame.accent ?? frame.color ?? colors.borderStrong;
  if (frame.frameStyle === 'plain') return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.inner, { borderColor: accent, top: inset, left: inset, right: inset, bottom: inset }]} />
      {frame.frameStyle === 'ornate'
        ? (['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <View
              key={corner}
              style={[
                styles.corner,
                { backgroundColor: accent, borderColor: frame.color ?? accent },
                corner.startsWith('t') ? { top: inset - 1 } : { bottom: inset - 1 },
                corner.endsWith('l') ? { left: inset - 1 } : { right: inset - 1 },
              ]}
            />
          ))
        : null}
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
  inner: { position: 'absolute', borderWidth: 1, borderRadius: radius.md, opacity: 0.9 },
  corner: { position: 'absolute', width: 12, height: 12, borderWidth: 2, transform: [{ rotate: '45deg' }] },
});
