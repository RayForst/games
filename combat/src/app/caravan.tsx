import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { GiIcon } from '@/components/GiIcon';
import { JobPanel } from '@/components/JobPanel';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { CARAVAN_AMBUSH, CARAVAN_MULT, TOWNS_BY_ID, townJobMult, townOf } from '@/game';
import { useGame } from '@/store/useGame';
import { spacing } from '@/ui/theme';

/** Караван из Брода: охрана обоза за плату. Платят в разы больше шахты, но на тракте бывает засада. */
export default function CaravanScreen() {
  const character = useGame((s) => s.character);
  if (!character) return null;
  const town = townOf(character.location) ?? TOWNS_BY_ID.brod;
  const mult = townJobMult(character.location);

  return (
    <Screen>
      <BackBar title={town.name} right={<Kredits value={character.kredits} />} />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <GiIcon name="caravan" size={30} />
          <Txt variant="title">{town.jobName}</Txt>
        </View>
        <Txt variant="muted">{town.jobHint} Платят больше шахты, дорога одна, разбойники её тоже знают.</Txt>
      </View>
      <JobPanel
        job="caravan"
        rateHint={`Ставка шахты × ${CARAVAN_MULT}${mult !== 1 ? ` × ${mult} (${town.perk.name.toLowerCase()})` : ''}. На обратном пути с шансом ${Math.round(CARAVAN_AMBUSH * 100)} % нападут: отобьёшься — доплатят, нет — заплатят половину.`}
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
