import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Bar } from './Bar';
import { Portrait } from './Portrait';
import { Txt } from './Txt';
import type { RaceId } from '@/game/races';
import { colors, radius, spacing } from '@/ui/theme';
import type { DerivedStats, Strike } from '@/game';

interface Props {
  name: string;
  level: number;
  hp: number;
  derived: DerivedStats;
  side: 'player' | 'enemy';
  /** Последний удар ПО этому бойцу — всплывает цифра урона и вспышка. */
  lastStrike?: Strike | null;
  /** Меняется каждый раунд, чтобы анимация запускалась заново. */
  strikeKey?: number;
  /** Именной соперник — портрет из таблицы, а не по сиду. */
  rivalId?: string;
  /** Травма — повязка на портрете. */
  injured?: boolean;
  /** Раса бойца — черты лица в портрете. */
  race?: RaceId;
}

function popText(s: Strike): { text: string; color: string; big: boolean } {
  switch (s.outcome) {
    case 'crit':
    case 'crit-through-block':
      return { text: `−${s.damage}!`, color: colors.gold, big: true };
    case 'hit':
      return { text: `−${s.damage}`, color: colors.red, big: false };
    case 'blocked':
      return { text: 'блок', color: colors.textMuted, big: false };
    case 'dodged':
      return { text: 'уворот', color: colors.blue, big: false };
  }
}

/** Цвет вспышки по исходу: крит — золото, попадание — кровь, блок — серый, уворот — синий. */
function flashColor(s: Strike): string {
  switch (s.outcome) {
    case 'crit':
    case 'crit-through-block':
      return colors.gold;
    case 'hit':
      return colors.red;
    case 'blocked':
      return colors.textMuted;
    case 'dodged':
      return colors.blue;
  }
}

export function FighterCard({ name, level, hp, derived, side, lastStrike, strikeKey, rivalId, injured, race }: Props) {
  const enemy = side === 'enemy';
  // Одна анимация на раунд: 0 — удар только что случился, 1 — всё растаяло.
  const [anim] = useState(() => new Animated.Value(1));
  // Тряска карточки от попадания: крит трясёт сильнее, блок и уворот — чуть вздрагивает.
  const [shake] = useState(() => new Animated.Value(0));

  const pop = lastStrike ? popText(lastStrike) : null;
  const damaged = lastStrike?.damage ? lastStrike.damage > 0 : false;

  useEffect(() => {
    if (strikeKey === undefined || !lastStrike) return;
    anim.setValue(0);
    shake.setValue(0);
    const amp = pop?.big ? 10 : damaged ? 6 : 2;
    const wobble = (to: number, duration: number) => Animated.timing(shake, { toValue: to, duration, easing: Easing.linear, useNativeDriver: true });
    Animated.parallel([
      Animated.timing(anim, { toValue: 1, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([wobble(-amp, 40), wobble(amp, 60), wobble(-amp * 0.6, 60), wobble(amp * 0.3, 60), wobble(0, 50)]),
    ]).start();
  }, [strikeKey, lastStrike, anim, shake, pop?.big, damaged]);

  // Цифра стартует ниже середины карточки и всплывает к верхнему краю, не уходя за него (overflow: hidden).
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const opacity = anim.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 1, 0] });
  const peak = pop?.big ? 0.45 : damaged ? 0.35 : 0.18;
  const flash = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [peak, peak * 0.7, 0] });
  const scale = anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [pop?.big ? 1.6 : 1.2, 1, 1] });

  return (
    <Animated.View style={[styles.card, enemy && styles.enemy, { transform: [{ translateX: shake }] }]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash, backgroundColor: lastStrike ? flashColor(lastStrike) : colors.red }]}
      />
      <View style={styles.body}>
        <View style={styles.portrait}>
          <Portrait seed={name} rivalId={rivalId} race={race} size={PORTRAIT} hpRatio={hp / derived.maxHp} injured={injured} backdrop tight />
        </View>
        <View style={styles.info}>
          <View style={styles.row}>
            <Txt variant="heading" numberOfLines={1} style={styles.name}>
              {name}
            </Txt>
            <Txt variant="small">{level} ур.</Txt>
          </View>
          <Bar value={hp} max={derived.maxHp} color={enemy ? colors.purple : colors.red} height={12} />
          <Txt variant="small">
            урон {derived.dmgMin}–{derived.dmgMax} · крит {derived.crit}% · уворот {derived.dodge}%
          </Txt>
        </View>
      </View>
      {pop ? (
        <Animated.View pointerEvents="none" style={[styles.pop, { opacity, transform: [{ translateY }, { scale }] }]}>
          <Txt bold color={pop.color} style={pop.big ? styles.popBig : styles.popText}>
            {pop.text}
          </Txt>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const PORTRAIT = 58;

const styles = StyleSheet.create({
  body: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  portrait: {
    width: PORTRAIT,
    height: PORTRAIT,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
    alignItems: 'center',
  },
  info: { flex: 1, gap: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    overflow: 'hidden',
  },
  enemy: { borderColor: colors.borderStrong },
  flash: { borderRadius: radius.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  name: { flex: 1 },
  pop: { position: 'absolute', right: spacing.lg, top: 40 },
  popText: { fontSize: 22, lineHeight: 26, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  popBig: { fontSize: 30, lineHeight: 34, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
});
