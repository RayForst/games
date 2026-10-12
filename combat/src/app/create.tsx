import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { baseStats, CREATION_FREE_POINTS, deriveStats, STAT_KEYS, STAT_LABELS, type Stats } from '@/game';
import { useGame } from '@/store/useGame';
import { colors, radius, spacing } from '@/ui/theme';

interface Preset {
  id: string;
  name: string;
  hint: string;
  apply: (s: Stats) => { stats: Stats; freePoints: number };
}

const PRESETS: Preset[] = [
  {
    id: 'warrior',
    name: 'Воин',
    hint: 'Сила +2, выносливость +1. Бьёт больно, терпит долго.',
    apply: (s) => ({ stats: { ...s, strength: s.strength + 2, endurance: s.endurance + 1 }, freePoints: 0 }),
  },
  {
    id: 'rogue',
    name: 'Ловкач',
    hint: 'Ловкость +2, интуиция +1. Уворачивается и критует.',
    apply: (s) => ({ stats: { ...s, dexterity: s.dexterity + 2, intuition: s.intuition + 1 }, freePoints: 0 }),
  },
  {
    id: 'crit',
    name: 'Критовик',
    hint: 'Интуиция +2, сила +1. Редко, но метко.',
    apply: (s) => ({ stats: { ...s, intuition: s.intuition + 2, strength: s.strength + 1 }, freePoints: 0 }),
  },
  {
    id: 'custom',
    name: 'Сам раскидаю',
    hint: `${CREATION_FREE_POINTS} свободных очка — распределишь на экране персонажа.`,
    apply: (s) => ({ stats: s, freePoints: CREATION_FREE_POINTS }),
  },
];

export default function CreateScreen() {
  const createCharacter = useGame((s) => s.createCharacter);
  const [name, setName] = useState('');
  const [presetId, setPresetId] = useState(PRESETS[0].id);

  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const build = useMemo(() => preset.apply(baseStats()), [preset]);
  const derived = useMemo(() => deriveStats(build.stats, 0, []), [build]);

  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 16;

  const submit = () => {
    if (!valid) return;
    createCharacter(trimmed, build.stats, build.freePoints);
    router.replace('/(tabs)/city');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.hero}>
          <Txt variant="title" center>
            Бойцовский клуб
          </Txt>
          <Txt variant="muted" center>
            Первое правило: бей первым.
          </Txt>
        </View>

        <Card title="Имя бойца">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Например, Крыса Вася"
            placeholderTextColor={colors.textDim}
            maxLength={16}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={submit}
            style={styles.input}
          />
          <Txt variant="small">От 2 до 16 символов.</Txt>
        </Card>

        <Card title="Стиль боя">
          {PRESETS.map((p) => {
            const active = p.id === presetId;
            return (
              <Pressable key={p.id} onPress={() => setPresetId(p.id)} style={[styles.preset, active && styles.presetActive]}>
                <View style={styles.radio}>{active ? <View style={styles.radioDot} /> : null}</View>
                <View style={styles.flex}>
                  <Txt bold color={active ? colors.gold : colors.text}>
                    {p.name}
                  </Txt>
                  <Txt variant="small">{p.hint}</Txt>
                </View>
              </Pressable>
            );
          })}
        </Card>

        <Card title="Что получится">
          <View style={styles.statsRow}>
            {STAT_KEYS.map((k) => (
              <View key={k} style={styles.statBox}>
                <Txt variant="small">{STAT_LABELS[k]}</Txt>
                <Txt bold style={styles.statValue}>
                  {build.stats[k]}
                </Txt>
              </View>
            ))}
          </View>
          <Txt variant="muted">
            Здоровье {derived.maxHp} · урон {derived.dmgMin}–{derived.dmgMax} · крит {derived.crit}% · уворот {derived.dodge}%
          </Txt>
        </Card>

        <Button title="Войти в клуб" onPress={submit} disabled={!valid} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { paddingVertical: spacing.xl, gap: spacing.xs },
  input: {
    color: colors.text,
    fontSize: 18,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bg,
  },
  preset: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetActive: { borderColor: colors.goldDim, backgroundColor: colors.bgElevated },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.goldDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  statValue: { fontSize: 20 },
});
