import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Bar } from './Bar';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { Flash } from './Flash';
import { GiIcon } from './GiIcon';
import { HomeLink } from './HomeLink';
import { Kredits } from './Kredits';
import { Screen } from './Screen';
import { Txt } from './Txt';
import {
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
  WILDS,
  type ActivityId,
  type GatherMinutes,
  type WildId,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { formatDuration } from '@/ui/format';
import { colors, radius, spacing } from '@/ui/theme';

/** Дикие земли (лес, болото, руины, перевал): занятия по времени, сумка, дорога домой. */
export function WildsHub({ wild }: { wild: WildId }) {
  const character = useGame((s) => s.character);
  const gathering = useGame((s) => s.gathering);
  const roadNews = useGame((s) => s.roadNews);
  const dismissRoadNews = useGame((s) => s.dismissRoadNews);
  const startGathering = useGame((s) => s.startGathering);
  const collectGathering = useGame((s) => s.collectGathering);
  const startTravel = useGame((s) => s.startTravel);
  const now = useNow();
  const def = WILDS[wild];
  const [activity, setActivity] = useState<ActivityId>(def.activities[0]);
  const [minutes, setMinutes] = useState<GatherMinutes>(15);
  const [flash, show] = useFlash(2500);

  if (!character) return null;

  const location = LOCATIONS_BY_ID[wild];
  const derived = deriveCharacter(character, now);
  const current = def.activities.includes(activity) ? activity : def.activities[0];
  const rate = gatherRatePerHour(current, derived);
  const home = routeBetween(wild, 'city');

  const onStart = () => {
    const r = startGathering(current, minutes);
    if (!r.ok) Alert.alert(location.name, r.reason ?? 'Не получилось');
  };

  const onCollect = () => {
    const r = collectGathering();
    if (!r.ok) {
      Alert.alert(location.name, r.reason ?? 'Не получилось');
      return;
    }
    if (r.ambush) {
      router.push('/fight');
      return;
    }
    const haul = r.resource ? ACTIVITIES_BY_ID[gathering?.activity ?? current]?.haul ?? '' : '';
    show(r.amount ? `+${r.amount} шт. в сумку: ${haul}.` : 'Пусто. Надо было дольше.');
  };

  const goHome = () => {
    const r = startTravel('city');
    if (!r.ok) Alert.alert('Дорога', r.reason ?? 'Не получилось');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title">{location.name}</Txt>
          <Txt variant="muted">{location.description}</Txt>
        </View>
        <Kredits value={character.kredits} />
      </View>
      <View style={styles.links}>
        <Pressable onPress={() => router.push('/world')} accessibilityRole="button" accessibilityLabel="Карта мира" style={styles.mapLink}>
          <GiIcon name="road" size={18} />
          <Txt variant="gold">Карта мира</Txt>
        </Pressable>
        <HomeLink onError={(reason) => show(reason)} />
      </View>

      {roadNews ? (
        <Pressable onPress={dismissRoadNews} accessibilityRole="button" accessibilityLabel="Дорожные вести">
          <Card style={styles.news}>
            <View style={styles.newsRow}>
              <GiIcon name="event" size={22} />
              <Txt style={styles.flex}>{roadNews}</Txt>
            </View>
            <Txt variant="small">Нажми, чтобы убрать.</Txt>
          </Card>
        </Pressable>
      ) : null}

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
          <Txt variant="small">
            Можно забрать раньше. На обратной тропе бывает засада ({Math.round(def.ambushChance * 100)} %): отобьёшься — унесёшь больше.
          </Txt>
        </Card>
      ) : (
        <Card title="Чем заняться">
          {def.activities.map((id) => {
            const a = ACTIVITIES_BY_ID[id];
            const active = id === current;
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
        {RESOURCES.filter((r) => character.resources[r.id] > 0 || def.activities.some((a) => ACTIVITIES_BY_ID[a].resource === r.id)).map((r) => (
          <View key={r.id} style={styles.resource}>
            <GiIcon name={r.icon} size={22} color={colors.textMuted} />
            <Txt style={styles.flex}>{r.name}</Txt>
            <Txt bold>{character.resources[r.id]} шт.</Txt>
          </View>
        ))}
        <Txt variant="small">Скупают в любом городе, цена меняется каждый день. Травы берёт лекарь, дрова и кости — Макар.</Txt>
      </Card>

      <Txt variant="small" center color={colors.textDim}>
        Кто тут водится: {def.foes.map((f) => f.name.toLowerCase()).join(', ')}.
      </Txt>

      <Button title={home ? `Вернуться в город · ${home.minutes} мин` : 'В город'} variant="secondary" onPress={goHome} disabled={!!gathering || !home} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingTop: spacing.sm },
  links: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  news: { borderColor: colors.gold },
  newsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
