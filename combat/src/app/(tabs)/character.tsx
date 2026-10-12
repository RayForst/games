import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PaperDoll } from '@/components/PaperDoll';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import {
  deriveCharacter,
  expForLevel,
  healCost,
  secondsToFullHp,
  SLOT_LABELS,
  STAT_KEYS,
  statLabelShort,
  type ItemDef,
  type Slot,
} from '@/game';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { colors, radius, spacing } from '@/ui/theme';

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Экран персонажа — «тамагочи»: аватар в центре, вещи по краям, здоровье одной полоской.
 * Все цифры (характеристики, модификаторы, броня) живут в листе `/stats`.
 */
export default function CharacterScreen() {
  const character = useGame((s) => s.character);
  const heal = useGame((s) => s.heal);
  const unequip = useGame((s) => s.unequip);
  const now = useNow();

  if (!character) return null;

  const derived = deriveCharacter(character);
  const toFull = secondsToFullHp(character, now);
  const cost = healCost(character);
  const nextExp = expForLevel(character.level + 1);
  const curExp = expForLevel(character.level);
  const free = character.freePoints;

  const onHeal = () => {
    const r = heal();
    if (!r.ok && r.reason) Alert.alert('Лекарь', r.reason);
  };

  const onSlot = (slot: Slot, item: ItemDef | null) => {
    // Пустой слот ведёт в рюкзак — там надевают.
    if (!item) {
      router.navigate('/(tabs)/backpack');
      return;
    }
    Alert.alert(item.name, `Снять ${SLOT_LABELS[slot].toLowerCase()}?`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Снять', style: 'destructive', onPress: () => unequip(slot) },
    ]);
  };

  const openStats = () => router.push('/stats');

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title" numberOfLines={1}>
            {character.name}
          </Txt>
          <Txt variant="muted">
            {character.level} уровень · {character.kredits} кр.
          </Txt>
        </View>
        <View style={styles.record}>
          <Txt bold style={styles.recordNumbers}>
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
          <Txt variant="small">бои</Txt>
        </View>
      </View>

      <PaperDoll character={character} onSlotPress={onSlot}>
        <Avatar hpRatio={character.hp / derived.maxHp} />
      </PaperDoll>

      <Card style={styles.vitals}>
        <View style={styles.hpRow}>
          <View style={styles.flex}>
            <Bar
              value={character.hp}
              max={derived.maxHp}
              height={12}
              label={toFull > 0 ? `Здоровье · до полного ${formatSeconds(toFull)}` : 'Здоровье'}
            />
          </View>
          <Button
            small
            variant="secondary"
            title={`Лекарь · ${cost} кр.`}
            onPress={onHeal}
            disabled={toFull === 0 || character.kredits < cost}
          />
        </View>
        <Bar
          value={character.exp - curExp}
          max={nextExp - curExp}
          color={colors.gold}
          height={5}
          showNumbers={false}
          label={`Опыт ${character.exp} / ${nextExp} · до ${character.level + 1} уровня`}
        />
      </Card>

      <Pressable
        onPress={openStats}
        accessibilityRole="button"
        accessibilityLabel="Характеристики"
        style={({ pressed }) => [styles.statsStrip, free > 0 && styles.statsStripHot, pressed && styles.pressed]}>
        {STAT_KEYS.map((k) => (
          <View key={k} style={styles.statCell}>
            <Txt variant="small" style={styles.statLabel}>
              {statLabelShort(k).toUpperCase()}
            </Txt>
            <Txt bold style={styles.statValue}>
              {derived.stats[k]}
            </Txt>
          </View>
        ))}
        {free > 0 ? (
          <View style={styles.freeBadge}>
            <Txt variant="small" bold color={colors.black}>
              +{free}
            </Txt>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        )}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, paddingTop: spacing.sm },
  record: { alignItems: 'flex-end', flexShrink: 0 },
  recordNumbers: { fontSize: 17, lineHeight: 22 },
  vitals: { padding: spacing.md, gap: spacing.sm },
  hpRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  statsStripHot: { borderColor: colors.gold },
  pressed: { opacity: 0.7 },
  statCell: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, lineHeight: 13, letterSpacing: 1 },
  statValue: { fontSize: 18, lineHeight: 22, fontVariant: ['tabular-nums'] },
  freeBadge: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
