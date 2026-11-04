import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Bar } from './Bar';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { Flash } from './Flash';
import { GiIcon } from './GiIcon';
import { Kredits } from './Kredits';
import { Screen } from './Screen';
import { Txt } from './Txt';
import {
  ACTIVITIES,
  ACTIVITIES_BY_ID,
  deriveCharacter,
  GATHER_MINUTES,
  gatherProgress,
  gatherRatePerHour,
  gatherSecondsLeft,
  gatherYield,
  LOCATIONS_BY_ID,
  RESOURCES,
  routeBetween,
  type ActivityId,
  type GatherMinutes,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { formatDuration } from '@/ui/format';
import { colors, radius, spacing } from '@/ui/theme';

/** Лес: три занятия по времени, сумка с ресурсами, дорога домой. */
export function ForestHub() {
  const character = useGame((s) => s.character);
  const gathering = useGame((s) => s.gathering);
  const startGathering = useGame((s) => s.startGathering);
  const collectGathering = useGame((s) => s.collectGathering);
  const startTravel = useGame((s) => s.startTravel);
  const now = useNow();
  const [activity, setActivity] = useState<ActivityId>('herbs');
  const [minutes, setMinutes] = useState<GatherMinutes>(15);
  const [flash, show] = useFlash(2500);

  if (!character) return null;

  const derived = deriveCharacter(character, now);
  const rate = gatherRatePerHour(activity, derived);
  const home = routeBetween('forest', 'city');

  const onStart = () => {
    const r = startGathering(activity, minutes);
    if (!r.ok) Alert.alert('Лес', r.reason ?? 'Не получилось');
  };

  const onCollect = () => {
    const r = collectGathering();
    if (!r.ok) {
      Alert.alert('Лес', r.reason ?? 'Не получилось');
      return;
    }
    if (r.ambush) {
      router.push('/fight');
      return;
    }
    const name = r.resource ? ACTIVITIES.find((a) => a.resource === r.resource)?.name ?? '' : '';
    show(r.amount ? `+${r.amount} шт. в сумку. ${name.replace('Собирать ', '').replace('Рубить ', '')}` : 'Пусто. Надо было дольше.');
  };

  const goHome = () => {
    const r = startTravel('city');
    if (!r.ok) Alert.alert('Дорога', r.reason ?? 'Не получилось');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title">Лес</Txt>
          <Txt variant="muted">{LOCATIONS_BY_ID.forest.description}</Txt>
        </View>
        <Kredits value={character.kredits} />
      </View>
      <Pressable onPress={() => router.push('/world')} accessibilityRole="button" accessibilityLabel="Карта мира" style={styles.mapLink}>
        <GiIcon name="road" size={18} />
        <Txt variant="gold">Карта мира</Txt>
      </Pressable>

      <Flash text={flash} />

      {gathering ? (
        <Card title={ACTIVITIES_BY_ID[gathering.activity].name} right={<Txt variant="small">смена {gathering.minutes} мин</Txt>}>
          <Bar
            value={gatherProgress(gathering, now) * 100}
            max={100}
            color={colors.green}
            height={8}
            showNumbers={false}
            label={gatherSecondsLeft(gathering, now) > 0 ? `Осталось ${formatDuration(gatherSecondsLeft(gathering, now))}` : 'Готово'}
          />
          <Txt>
            Набрал: <Txt variant="gold">{gatherYield(gathering, gatherRatePerHour(gathering.activity, derived), now)} шт.</Txt>
          </Txt>
          <Button title="Забрать" onPress={onCollect} />
          <Txt variant="small">Можно забрать раньше. На обратной тропе бывает засада: отобьёшься — унесёшь больше.</Txt>
        </Card>
      ) : (
        <Card title="Чем заняться">
          {ACTIVITIES.map((a) => {
            const active = a.id === activity;
            return (
              <Pressable
                key={a.id}
                onPress={() => setActivity(a.id)}
                accessibilityRole="button"
                accessibilityLabel={a.name}
                style={[styles.activity, active && styles.activityActive]}>
                <GiIcon name={a.icon} size={30} color={active ? colors.gold : colors.textMuted} />
                <View style={styles.flex}>
                  <Txt bold color={active ? colors.gold : colors.text}>
                    {a.name}
                  </Txt>
                  <Txt variant="small">
                    {gatherRatePerHour(a.id, derived)} шт./ч · {a.flavor}
                  </Txt>
                </View>
              </Pressable>
            );
          })}
          <View style={styles.chips}>
            {GATHER_MINUTES.map((m) => (
              <Chip key={m} label={`${m} мин · ~${Math.floor((rate * m) / 60)} шт.`} active={m === minutes} onPress={() => setMinutes(m)} />
            ))}
          </View>
          <Button title="Начать" onPress={onStart} />
        </Card>
      )}

      <Card title="Сумка">
        {RESOURCES.map((r) => (
          <View key={r.id} style={styles.resource}>
            <GiIcon name={r.icon} size={22} color={colors.textMuted} />
            <Txt style={styles.flex}>{r.name}</Txt>
            <Txt bold>{character.resources[r.id]} шт.</Txt>
          </View>
        ))}
        <Txt variant="small">Скупают в городской лавке, цена меняется каждый день.</Txt>
      </Card>

      <Button title={home ? `Вернуться в город · ${home.minutes} мин` : 'В город'} variant="secondary" onPress={goHome} disabled={!!gathering} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingTop: spacing.sm },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  activity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activityActive: { borderColor: colors.goldDim, backgroundColor: colors.bgElevated },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  resource: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
