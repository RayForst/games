import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatRow } from '@/components/StatRow';
import { Txt } from '@/components/Txt';
import { ARMOR_ZONE_LABELS, ARMOR_ZONES, deriveCharacter, STAT_HINTS, STAT_KEYS, STAT_LABELS } from '@/game';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

/** Лист с цифрами: характеристики (и раскидка очков), модификаторы, броня. Открывается модалкой поверх табов. */
export default function StatsScreen() {
  const character = useGame((s) => s.character);
  const addStat = useGame((s) => s.addStat);
  const resetGame = useGame((s) => s.resetGame);

  if (!character) return null;

  const derived = deriveCharacter(character);
  const free = character.freePoints;

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.dismissTo('/(tabs)/character');
  };

  const onReset = () => {
    Alert.alert('Начать заново', 'Персонаж, вещи и прогресс будут удалены. Точно?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          resetGame();
          // Сначала закрываем лист до табов, потом меняем табы на создание — иначе в стеке останется лишний экран.
          router.dismissAll();
          router.replace('/create');
        },
      },
    ]);
  };

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title" numberOfLines={1}>
            {character.name}
          </Txt>
          <Txt variant="muted">
            {character.level} уровень · {character.kredits} кр.
          </Txt>
        </View>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Закрыть" style={styles.close}>
          <Ionicons name="close" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

      <Card
        title="Характеристики"
        right={free > 0 ? <Txt variant="gold">Свободно: {free}</Txt> : <Txt variant="small">Очков нет</Txt>}>
        {STAT_KEYS.map((k) => (
          <StatRow
            key={k}
            label={STAT_LABELS[k]}
            hint={STAT_HINTS[k]}
            value={character.stats[k]}
            bonus={derived.stats[k] - character.stats[k]}
            onPlus={free > 0 ? () => addStat(k) : undefined}
          />
        ))}
      </Card>

      <Card title="Модификаторы">
        <Row label="Урон" value={`${derived.dmgMin}–${derived.dmgMax}`} />
        <Row label="Мф. удара (крит)" value={`${derived.crit}%`} />
        <Row label="Мф. против удара" value={`${derived.antiCrit}%`} />
        <Row label="Мф. уворота" value={`${derived.dodge}%`} />
        <Row label="Мф. против уворота" value={`${derived.antiDodge}%`} />
      </Card>

      <Card title="Броня">
        <View style={styles.armorRow}>
          {ARMOR_ZONES.map((z) => (
            <View key={z} style={styles.armorCell}>
              <Txt variant="small">{ARMOR_ZONE_LABELS[z]}</Txt>
              <Txt bold style={styles.armorValue}>
                {derived.armor[z]}
              </Txt>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.flex} />
      <Button title="Начать заново" variant="ghost" onPress={onReset} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Txt variant="muted">{label}</Txt>
      <Txt bold>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingTop: spacing.sm },
  close: { padding: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  armorRow: { flexDirection: 'row', gap: spacing.sm },
  armorCell: { flex: 1, alignItems: 'center' },
  armorValue: { fontSize: 18, lineHeight: 22 },
});
