import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PaperDoll } from '@/components/PaperDoll';
import { Screen } from '@/components/Screen';
import { StatRow } from '@/components/StatRow';
import { Txt } from '@/components/Txt';
import {
  ARMOR_ZONE_LABELS,
  ARMOR_ZONES,
  deriveCharacter,
  expForLevel,
  healCost,
  itemOf,
  secondsToFullHp,
  SLOT_LABELS,
  STAT_HINTS,
  STAT_KEYS,
  STAT_LABELS,
  type Slot,
} from '@/game';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CharacterScreen() {
  const character = useGame((s) => s.character);
  const addStat = useGame((s) => s.addStat);
  const heal = useGame((s) => s.heal);
  const unequip = useGame((s) => s.unequip);
  const resetGame = useGame((s) => s.resetGame);
  const now = useNow();

  if (!character) return null;

  const derived = deriveCharacter(character);
  const toFull = secondsToFullHp(character, now);
  const cost = healCost(character);
  const nextExp = expForLevel(character.level + 1);
  const curExp = expForLevel(character.level);

  const onHeal = () => {
    const r = heal();
    if (!r.ok && r.reason) Alert.alert('Лекарь', r.reason);
  };

  const onSlot = (slot: Slot) => {
    const uid = character.equipment[slot];
    const item = uid ? itemOf(uid, character) : null;
    if (!item) return;
    Alert.alert(item.name, `Снять ${SLOT_LABELS[slot].toLowerCase()}?`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Снять', style: 'destructive', onPress: () => unequip(slot) },
    ]);
  };

  const onReset = () => {
    Alert.alert('Начать заново', 'Персонаж, вещи и прогресс будут удалены. Точно?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          resetGame();
          router.replace('/create');
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title">{character.name}</Txt>
          <Txt variant="muted">
            {character.level} уровень · {character.kredits} кр.
          </Txt>
        </View>
        <View style={styles.record}>
          <Txt variant="small">побед / поражений / ничьих</Txt>
          <Txt bold>
            <Txt color={colors.green} bold>
              {character.wins}
            </Txt>
            {' / '}
            <Txt color={colors.red} bold>
              {character.losses}
            </Txt>
            {' / '}
            {character.draws}
          </Txt>
        </View>
      </View>

      <Card title="Здоровье">
        <Bar value={character.hp} max={derived.maxHp} />
        <View style={styles.rowBetween}>
          <Txt variant="small">{toFull > 0 ? `До полного: ${formatSeconds(toFull)}` : 'Полное здоровье'}</Txt>
          <Button
            small
            variant="secondary"
            title={`Лекарь · ${cost} кр.`}
            onPress={onHeal}
            disabled={toFull === 0 || character.kredits < cost}
          />
        </View>
      </Card>

      <Card title="Опыт">
        <Bar value={character.exp - curExp} max={nextExp - curExp} color={colors.gold} height={10} showNumbers={false} />
        <Txt variant="small">
          {character.exp} / {nextExp} до {character.level + 1} уровня
        </Txt>
      </Card>

      <Card
        title="Характеристики"
        right={
          character.freePoints > 0 ? (
            <Txt variant="gold">Свободно: {character.freePoints}</Txt>
          ) : (
            <Txt variant="small">Очков нет</Txt>
          )
        }>
        {STAT_KEYS.map((k) => (
          <StatRow
            key={k}
            label={STAT_LABELS[k]}
            hint={STAT_HINTS[k]}
            value={character.stats[k]}
            bonus={derived.stats[k] - character.stats[k]}
            onPlus={character.freePoints > 0 ? () => addStat(k) : undefined}
          />
        ))}
      </Card>

      <Card title="Модификаторы">
        <Row label="Урон" value={`${derived.dmgMin}–${derived.dmgMax}`} />
        <Row label="Мф. удара (крит)" value={`${derived.crit}%`} />
        <Row label="Мф. против удара" value={`${derived.antiCrit}%`} />
        <Row label="Мф. уворота" value={`${derived.dodge}%`} />
        <Row label="Мф. против уворота" value={`${derived.antiDodge}%`} />
        <Row label="Броня" value={ARMOR_ZONES.map((z) => `${ARMOR_ZONE_LABELS[z].toLowerCase()} ${derived.armor[z]}`).join(' · ')} />
      </Card>

      <Card title="Экипировка">
        <PaperDoll character={character} onSlotPress={onSlot} />
        <Txt variant="small">Нажми на предмет, чтобы снять. Надеть можно в рюкзаке.</Txt>
      </Card>

      <Button title="Начать заново" variant="ghost" onPress={onReset} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Txt variant="muted">{label}</Txt>
      <Txt bold style={styles.rowValue}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, paddingTop: spacing.sm },
  record: { alignItems: 'flex-end' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowValue: { flexShrink: 1, textAlign: 'right' },
});
