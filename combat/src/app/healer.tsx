import { Alert, StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Flash } from '@/components/Flash';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { BUILDINGS_BY_ID, deriveCharacter, healCost, secondsToFullHp } from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { formatDuration } from '@/ui/format';
import { colors } from '@/ui/theme';

/** Лекарь: мгновенное лечение за кредиты. Бесплатная альтернатива — подождать регенерацию. */
export default function HealerScreen() {
  const character = useGame((s) => s.character);
  const heal = useGame((s) => s.heal);
  const now = useNow();
  const [flash, show] = useFlash();

  if (!character) return null;

  const derived = deriveCharacter(character);
  const toFull = secondsToFullHp(character, now);
  const cost = healCost(character);
  const healthy = toFull === 0;
  const poor = character.kredits < cost;

  const onHeal = () => {
    const r = heal();
    if (!r.ok) {
      Alert.alert('Лекарь', r.reason ?? 'Не получилось');
      return;
    }
    show('Заштопал. Как новенький.');
  };

  return (
    <Screen>
      <BackBar right={<Txt variant="gold">{character.kredits} кр.</Txt>} />
      <View>
        <Txt variant="title">Лекарь</Txt>
        <Txt variant="muted">{BUILDINGS_BY_ID.healer.description}</Txt>
      </View>

      <Flash text={flash} />

      <Card title="Здоровье">
        <Bar value={character.hp} max={derived.maxHp} />
        <Txt variant="small">{healthy ? 'Ты здоров, лечить нечего.' : `Само заживёт через ${formatDuration(toFull)}.`}</Txt>
        <Button title={`Вылечиться · ${cost} кр.`} onPress={onHeal} disabled={healthy || poor} />
        {!healthy && poor ? (
          <Txt variant="small" color={colors.red} style={styles.note}>
            Не хватает кредитов. Подожди или сходи в шахту.
          </Txt>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: 2 },
});
