import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Bar } from './Bar';
import { Button } from './Button';
import { Card } from './Card';
import { GiIcon } from './GiIcon';
import { Screen } from './Screen';
import { Txt } from './Txt';
import { LOCATIONS_BY_ID, travelProgress, travelSecondsLeft } from '@/game';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { formatDuration } from '@/ui/format';
import { colors, spacing } from '@/ui/theme';

/** Экран дороги: персонаж идёт между локациями, делать нечего, кроме как ждать. */
export function TravelHub() {
  const travel = useGame((s) => s.travel);
  const now = useNow();
  if (!travel) return null;

  return (
    <Screen>
      <View style={styles.hero}>
        <GiIcon name="road" size={64} />
        <Txt variant="title" center>
          В пути
        </Txt>
        <Txt variant="muted" center>
          {LOCATIONS_BY_ID[travel.from].name} → {LOCATIONS_BY_ID[travel.to].name}
        </Txt>
      </View>
      <Card>
        <Bar value={travelProgress(travel, now) * 100} max={100} color={colors.gold} height={10} showNumbers={false} label={`Осталось ${formatDuration(travelSecondsLeft(travel, now))}`} />
        <Txt variant="small">Пыль, грязь и чужие следы. Можно закрыть игру: дойдёшь по часам.</Txt>
      </Card>
      <Button title="Карта мира" variant="secondary" onPress={() => router.push('/world')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
});
