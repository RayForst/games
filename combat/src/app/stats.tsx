import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Flash } from '@/components/Flash';
import { Screen } from '@/components/Screen';
import { StatRow } from '@/components/StatRow';
import { Txt } from '@/components/Txt';
import { ACHIEVEMENTS, ARMOR_ZONE_LABELS, ARMOR_ZONES, deriveCharacter, PERKS_BY_ID, rankFor, STAT_HINTS, STAT_KEYS, STAT_LABELS, type PerkId } from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

/** Лист с цифрами: характеристики (и раскидка очков), модификаторы, броня. Открывается модалкой поверх табов. */
export default function StatsScreen() {
  const character = useGame((s) => s.character);
  const addStat = useGame((s) => s.addStat);
  const resetGame = useGame((s) => s.resetGame);
  const claimAchievement = useGame((s) => s.claimAchievement);
  const [flash, show] = useFlash();

  if (!character) return null;

  const derived = deriveCharacter(character);
  const free = character.freePoints;
  const l = character.ledger;

  const onClaim = (id: string) => {
    const r = claimAchievement(id);
    show(r.ok ? `+${r.kredits} кр. за достижение` : (r.reason ?? 'Не получилось'));
  };

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

      {character.perks.length > 0 ? (
        <Card title="Умения">
          {character.perks.map((id) => {
            const perk = PERKS_BY_ID[id as PerkId];
            return perk ? <Row key={id} label={perk.name} value={perk.description} /> : null;
          })}
        </Card>
      ) : null}

      <Card title="Статистика" right={<Txt variant="small">{rankFor(character.rating)} · {character.rating}</Txt>}>
        <Row label="Бои" value={`${l.fightsTotal} · побед ${character.wins}, поражений ${character.losses}, ничьих ${character.draws}`} />
        <Row label="Серия побед" value={`${l.streak} сейчас · лучшая ${l.bestStreak}`} />
        <Row label="Урон" value={`нанёс ${l.damageDealt} · получил ${l.damageTaken}`} />
        <Row label="Критов" value={`${l.crits}`} />
        <Row label="Кредиты" value={`заработано ${l.kreditsEarned} · потрачено ${l.kreditsSpent}`} />
        <Row label="Шахта" value={`${l.mineEarned} кр.`} />
        <Row label="Куплено вещей" value={`${l.itemsBought}`} />
        <Row label="Турниров выиграно" value={`${l.tournamentsWon}`} />
        {character.titles.length > 0 ? <Row label="Титулы" value={character.titles.join(', ')} /> : null}
      </Card>

      <Flash text={flash} />

      <Card title="Достижения" right={<Txt variant="small">{character.achievements.length}/{ACHIEVEMENTS.length}</Txt>}>
        {ACHIEVEMENTS.map((a) => {
          const claimed = character.achievements.includes(a.id);
          const done = a.check(character);
          const [have, need] = a.progress ? a.progress(character) : [done ? 1 : 0, 1];
          return (
            <View key={a.id} style={[styles.achievement, claimed && styles.achievementClaimed]}>
              <View style={styles.achievementHead}>
                <View style={styles.flex}>
                  <Txt bold>{a.name}</Txt>
                  <Txt variant="small">{a.description}</Txt>
                </View>
                {claimed ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.green} />
                ) : done ? (
                  <Button small title={`Забрать ${a.reward} кр.`} onPress={() => onClaim(a.id)} />
                ) : (
                  <Txt variant="small" color={colors.gold}>
                    {a.reward} кр.
                  </Txt>
                )}
              </View>
              {!claimed && a.progress ? <Bar value={have} max={need} height={4} color={done ? colors.green : colors.gold} showNumbers={false} /> : null}
            </View>
          );
        })}
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
      <Txt bold style={styles.rowValue}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingTop: spacing.sm },
  close: { padding: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  achievement: { gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  achievementClaimed: { opacity: 0.55 },
  achievementHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  armorRow: { flexDirection: 'row', gap: spacing.sm },
  armorCell: { flex: 1, alignItems: 'center' },
  armorValue: { fontSize: 18, lineHeight: 22 },
});
