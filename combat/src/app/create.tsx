import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import {
  baseStats,
  CAPITALS_BY_ID,
  CREATION_FREE_POINTS,
  deriveStats,
  racesOf,
  raceStats,
  RACES_BY_ID,
  SIDES,
  STAT_KEYS,
  STAT_LABELS,
  type RaceId,
  type SideId,
  type Stats,
} from '@/game';
import { useGame } from '@/store/useGame';
import { colors, radius, sideColors, spacing } from '@/ui/theme';

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

/**
 * Создание персонажа одним скроллом: сторона → раса → имя и стиль боя.
 * Раса даёт +1 к характеристике — он сразу виден в предпросмотре.
 */
export default function CreateScreen() {
  const createCharacter = useGame((s) => s.createCharacter);
  const [name, setName] = useState('');
  const [side, setSide] = useState<SideId>('crown');
  const [raceBySide, setRaceBySide] = useState<Record<SideId, RaceId>>({ crown: 'human', free: 'steppe' });
  const [presetId, setPresetId] = useState(PRESETS[0].id);

  const race = raceBySide[side];
  const raceDef = RACES_BY_ID[race];
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];
  const build = useMemo(() => preset.apply(baseStats()), [preset]);
  const stats = useMemo(() => raceStats(build.stats, race), [build, race]);
  const derived = useMemo(() => deriveStats(stats, 0, [], [], race), [stats, race]);

  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 16;

  const submit = () => {
    if (!valid) return;
    createCharacter(trimmed, build.stats, build.freePoints, { side, race });
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

        <Card title="Сторона">
          <View style={styles.sides}>
            {SIDES.map((s) => {
              const active = s.id === side;
              const color = sideColors[s.id];
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSide(s.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.sideCard, active && { borderColor: color, backgroundColor: colors.bgElevated }]}>
                  <Txt variant="heading" color={active ? color : colors.text}>
                    {s.name}
                  </Txt>
                  <Txt variant="small">{s.description}</Txt>
                </Pressable>
              );
            })}
          </View>
          <Txt variant="small" color={colors.textDim}>
            Чужую сторону бьют за рейтинг и очки в войне сторон. Гильдии берут только своих. Перебежать можно у князя.
          </Txt>
        </Card>

        <Card title="Раса">
          {racesOf(side).map((r) => {
            const active = r.id === race;
            const color = sideColors[side];
            return (
              <Pressable
                key={r.id}
                onPress={() => setRaceBySide({ ...raceBySide, [side]: r.id })}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.preset, active && { borderColor: color, backgroundColor: colors.bgElevated }]}>
                <View style={[styles.radio, { borderColor: color }]}>{active ? <View style={[styles.radioDot, { backgroundColor: color }]} /> : null}</View>
                <View style={styles.flex}>
                  <View style={styles.raceHead}>
                    <Txt bold color={active ? color : colors.text}>
                      {r.name}
                    </Txt>
                    <Txt variant="small" color={colors.gold}>
                      +1 {STAT_LABELS[r.stat].toLowerCase()} · {r.trait.name}
                    </Txt>
                  </View>
                  <Txt variant="small">{r.description}</Txt>
                  <Txt variant="small" color={colors.textMuted}>
                    {r.trait.description}. На улице зовут «{r.nickname}». Родной город — {CAPITALS_BY_ID[r.capital].name}.
                  </Txt>
                </View>
              </Pressable>
            );
          })}
        </Card>

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
                <Txt bold style={styles.statValue} color={k === raceDef.stat ? sideColors[side] : colors.text}>
                  {stats[k]}
                </Txt>
              </View>
            ))}
          </View>
          <Txt variant="muted">
            Здоровье {derived.maxHp} · урон {derived.dmgMin}–{derived.dmgMax} · крит {derived.crit}% · уворот {derived.dodge}%
          </Txt>
          <Txt variant="small">
            {raceDef.name} · {SIDES.find((s) => s.id === side)?.name}: {raceDef.trait.description.toLowerCase()}.
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
  sides: { flexDirection: 'row', gap: spacing.sm },
  sideCard: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  raceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
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
