import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { deriveCharacter, type Opponent } from '@/game';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

export default function ArenaScreen() {
  const character = useGame((s) => s.character);
  const arena = useGame((s) => s.arena);
  const refreshArena = useGame((s) => s.refreshArena);
  const startFight = useGame((s) => s.startFight);

  if (!character) return null;

  const derived = deriveCharacter(character);
  const hpRatio = character.hp / derived.maxHp;
  const weak = hpRatio < 0.35;

  const challenge = (o: Opponent) => {
    const go = () => {
      const r = startFight(o.id);
      if (!r.ok) {
        Alert.alert('Арена', r.reason ?? 'Не получилось');
        return;
      }
      router.push('/fight');
    };
    if (weak) {
      Alert.alert('Ты ранен', `У тебя ${character.hp} из ${derived.maxHp} hp. Всё равно выйти против ${o.name}?`, [
        { text: 'Подождать', style: 'cancel' },
        { text: 'В бой', style: 'destructive', onPress: go },
      ]);
      return;
    }
    go();
  };

  return (
    <Screen>
      <BackBar right={<Txt variant="gold">{character.kredits} кр.</Txt>} />
      <View style={styles.header}>
        <Txt variant="title">Арена</Txt>
        <Txt variant="muted">Выбери соперника. Бой — до первого упавшего.</Txt>
      </View>

      <Card>
        <Bar value={character.hp} max={derived.maxHp} label={`${character.name}, ${character.level} ур.`} />
        {weak ? (
          <Txt variant="small" color={colors.red}>
            Здоровья мало. Можно подождать или сходить к лекарю.
          </Txt>
        ) : null}
      </Card>

      {arena.length === 0 ? (
        <Card>
          <Txt variant="muted" center>
            В зале пусто.
          </Txt>
        </Card>
      ) : null}

      {arena.map((o) => {
        const stronger = o.level > character.level;
        const weaker = o.level < character.level;
        return (
          <Card key={o.id}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Txt variant="heading">{o.name}</Txt>
                <Txt variant="small" style={styles.flavor}>
                  {o.flavor}
                </Txt>
              </View>
              <Txt bold color={stronger ? colors.red : weaker ? colors.green : colors.text}>
                {o.level} ур.
              </Txt>
            </View>
            <Txt variant="muted">
              hp {o.derived.maxHp} · урон {o.derived.dmgMin}–{o.derived.dmgMax} · крит {o.derived.crit}% · уворот {o.derived.dodge}%
            </Txt>
            <Txt variant="small">
              Сила {o.derived.stats.strength} · Ловкость {o.derived.stats.dexterity} · Интуиция {o.derived.stats.intuition} ·
              Выносливость {o.derived.stats.endurance} · предметов: {o.itemIds.length}
            </Txt>
            <Button title="Вызвать на бой" onPress={() => challenge(o)} />
          </Card>
        );
      })}

      <Button title="Другие соперники" variant="secondary" onPress={refreshArena} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: spacing.sm, gap: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  flavor: { fontStyle: 'italic' },
});
