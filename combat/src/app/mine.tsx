import { StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Hint } from '@/components/Hint';
import { JobPanel } from '@/components/JobPanel';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { BUILDINGS_BY_ID, deriveCharacter, TOWNS_BY_ID, townOf } from '@/game';
import { useGame } from '@/store/useGame';

/** Шахта: отправить персонажа на смену и забрать кредиты. Работает офлайн, по часам телефона. */
export default function MineScreen() {
  const character = useGame((s) => s.character);
  if (!character) return null;
  const d = deriveCharacter(character);
  const town = townOf(character.location) ?? TOWNS_BY_ID.city;

  return (
    <Screen>
      <BackBar title={town.id === 'city' ? undefined : town.name} right={<Kredits value={character.kredits} />} />
      <View style={styles.header}>
        <Txt variant="title">{town.jobName}</Txt>
        <Txt variant="muted">{town.id === 'city' ? BUILDINGS_BY_ID.mine.description : town.jobHint}</Txt>
      </View>
      <Hint screen="mine" />
      <JobPanel
        job="mine"
        rateHint={`Сила ${d.stats.strength} машет киркой, выносливость ${d.stats.endurance} держит темп. Прокачаешь — платить будут больше.`}
        idleHint="Пока ты в шахте, арена закрыта. Уйти можно раньше: заплатят за отработанное. Здоровье восстанавливается как обычно."
        startTitle={(h) => `Спуститься на ${h} ч`}
        workingTitle="Ты в шахте"
        collectedText={(k) => `+${k} кр. Смена засчитана.`}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2 },
});
