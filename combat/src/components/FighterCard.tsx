import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Bar } from './Bar';
import { Txt } from './Txt';
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

export function FighterCard({ name, level, hp, derived, side, lastStrike, strikeKey }: Props) {
  const enemy = side === 'enemy';
  // Одна анимация на раунд: 0 — удар только что случился, 1 — всё растаяло.
  const [anim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (strikeKey === undefined || !lastStrike) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 950, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [strikeKey, lastStrike, anim]);

  const pop = lastStrike ? popText(lastStrike) : null;
  const damaged = lastStrike?.damage ? lastStrike.damage > 0 : false;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -34] });
  const opacity = anim.interpolate({ inputRange: [0, 0.55, 1], outputRange: [1, 1, 0] });
  const flash = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [damaged ? 0.35 : 0, damaged ? 0.25 : 0, 0] });

  return (
    <View style={[styles.card, enemy && styles.enemy]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash, backgroundColor: pop?.big ? colors.gold : colors.red }]}
      />
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
      {pop ? (
        <Animated.View pointerEvents="none" style={[styles.pop, { opacity, transform: [{ translateY }] }]}>
          <Txt bold color={pop.color} style={pop.big ? styles.popBig : styles.popText}>
            {pop.text}
          </Txt>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
  pop: { position: 'absolute', right: spacing.lg, top: spacing.lg },
  popText: { fontSize: 22, lineHeight: 26, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  popBig: { fontSize: 30, lineHeight: 34, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
});
