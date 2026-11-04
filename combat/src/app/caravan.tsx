import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { GiIcon } from '@/components/GiIcon';
import { JobPanel } from '@/components/JobPanel';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { CARAVAN_AMBUSH, CARAVAN_MULT } from '@/game';
import { useGame } from '@/store/useGame';
import { spacing } from '@/ui/theme';

/** Караван из Брода: охрана обоза за плату. Платят в разы больше шахты, но на тракте бывает засада. */
export default function CaravanScreen() {
  const character = useGame((s) => s.character);
  if (!character) return null;

  return (
    <Screen>
      <BackBar title="Брод" right={<Kredits value={character.kredits} />} />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <GiIcon name="caravan" size={30} />
          <Txt variant="title">Караван</Txt>
        </View>
        <Txt variant="muted">
          Купцы Брода возят товар через перевал и платят охране втрое против шахты. Дорога одна, разбойники её тоже знают.
        </Txt>
      </View>
      <JobPanel
        job="caravan"
        rateHint={`Ставка шахты × ${CARAVAN_MULT}. На обратном пути с шансом ${Math.round(CARAVAN_AMBUSH * 100)} % нападут: отобьёшься — доплатят, нет — заплатят половину.`}
        idleHint="Пока ты с караваном, арена закрыта. Можно вернуться раньше, заплатят за пройденное."
        startTitle={(h) => `Наняться на ${h} ч`}
        workingTitle="Ты с караваном"
        collectedText={(k) => `+${k} кр. Купцы довольны.`}
        onAmbush={() => router.push('/fight')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
