import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { GiIcon } from './GiIcon';
import { Txt } from './Txt';
import { hintFor, TUTORIAL_STEPS, type TutorialScreen } from '@/game';
import { useGame } from '@/store/useGame';
import { colors, radius, spacing } from '@/ui/theme';

interface Props {
  screen: TutorialScreen;
  style?: StyleProp<ViewStyle>;
}

/**
 * Полоска-подсказка обучения: текущий шаг, «Понял» и «Пропустить». Сама исчезает, когда шаг сделан.
 * Ставить в поток экрана (не поверх кнопок), чтобы ничего не перекрывать.
 */
export function Hint({ screen, style }: Props) {
  const tutorial = useGame((s) => s.tutorial);
  const advance = useGame((s) => s.advanceTutorial);
  const skip = useGame((s) => s.skipTutorial);
  const step = hintFor(tutorial, screen);
  const [fade] = useState(() => new Animated.Value(0));

  // Новый шаг — мягкое появление.
  const stepId = step?.id;
  useEffect(() => {
    if (!stepId) return;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [stepId, fade]);

  if (!step) return null;
  const n = TUTORIAL_STEPS.indexOf(step) + 1;

  return (
    <Animated.View style={[styles.wrap, { opacity: fade }, style]} accessibilityRole="summary" accessibilityLabel={`Обучение: ${step.title}`}>
      <View style={styles.icon}>
        <GiIcon name="fist" size={22} color={colors.gold} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Txt bold color={colors.gold} style={styles.title}>
            {step.title}
          </Txt>
          <Txt variant="small" color={colors.textDim}>
            {n}/{TUTORIAL_STEPS.length}
          </Txt>
        </View>
        <Txt variant="small" color={colors.text} style={styles.text}>
          {step.text}
        </Txt>
        <View style={styles.actions}>
          <Pressable onPress={() => advance(undefined, true)} accessibilityRole="button" accessibilityLabel="Понял" style={styles.ok}>
            <Txt variant="small" bold color={colors.black}>
              Понял
            </Txt>
          </Pressable>
          <Pressable onPress={skip} accessibilityRole="button" accessibilityLabel="Пропустить обучение" style={styles.skip}>
            <Txt variant="small" color={colors.textMuted}>
              Пропустить обучение
            </Txt>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(20, 16, 12, 0.92)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldDim,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    padding: spacing.sm,
    paddingLeft: spacing.md,
  },
  icon: { width: 28, alignItems: 'center', paddingTop: 2 },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  title: { fontSize: 14, lineHeight: 18 },
  text: { lineHeight: 17 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 2 },
  ok: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: spacing.md },
  skip: { paddingVertical: 4 },
});
