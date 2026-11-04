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
  activeInjury,
  deriveCharacter,
  originText,
  expForLevel,
  injurySecondsLeft,
  injuryText,
  claimableAchievements,
  equippedCosmetic,
  PERKS_BY_ID,
  rankFor,
  ROLE_LABELS,
  type PerkId,
  healCost,
  secondsToFullHp,
  SLOT_LABELS,
  STAT_KEYS,
  statLabelShort,
  type ItemDef,
  type Slot,
} from '@/game';
import { useNow } from '@/hooks/useNow';
import { playSfx } from '@/ui/sfx';
import { useGame } from '@/store/useGame';
import { colors, radius, spacing, sideColors } from '@/ui/theme';

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
  const choosePerk = useGame((s) => s.choosePerk);
  const unequip = useGame((s) => s.unequip);
  const guild = useGame((s) => s.guild);
  const account = useGame((s) => s.account);
  const sound = useGame((s) => s.settings.sound);
  const setSound = useGame((s) => s.setSound);
  const now = useNow();

  if (!character) return null;

  const derived = deriveCharacter(character);
  const toFull = secondsToFullHp(character, now);
  const cost = healCost(character);
  const nextExp = expForLevel(character.level + 1);
  const curExp = expForLevel(character.level);
  const free = character.freePoints;
  const injury = activeInjury(character, now);
  const claimable = claimableAchievements(character).length;
  const nickname = equippedCosmetic(character, 'title');

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
            {guild ? `[${guild.tag}] ` : ''}
            {character.name}
          </Txt>
          <Txt variant="muted">
            {character.level} уровень · {character.kredits} кр. · <Txt variant="muted" color={sideColors[character.side]}>{originText(character.side, character.race)}</Txt>
          </Txt>
          <Txt variant="small" color={colors.gold}>
            {nickname ? `«${nickname.name}» · ` : ''}
            {rankFor(character.rating)} · рейтинг {character.rating}
            {character.titles.length > 0 ? ` · ${character.titles[character.titles.length - 1]}` : ''}
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
        <Avatar seed={character.name} hpRatio={character.hp / derived.maxHp} injured={!!injury} frame={equippedCosmetic(character, 'frame')} cardBg={equippedCosmetic(character, 'cardBg')} />
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
        {injury ? (
          <Txt variant="small" color={colors.red}>
            {injuryText(injury)} · ещё {formatSeconds(injurySecondsLeft(injury, now))} · лекарь вправит
          </Txt>
        ) : null}
      </Card>

      {character.perkChoices ? (
        <Card title="Выбери умение" right={character.perkPicks > 1 ? <Txt variant="small">ещё {character.perkPicks}</Txt> : undefined} style={styles.perkCard}>
          {character.perkChoices.map((id) => {
            const perk = PERKS_BY_ID[id as PerkId];
            if (!perk) return null;
            return (
              <Pressable
                key={id}
                onPress={() => choosePerk(perk.id)}
                accessibilityRole="button"
                accessibilityLabel={`Умение: ${perk.name}`}
                style={({ pressed }) => [styles.perkOption, pressed && styles.pressed]}>
                <Txt bold color={colors.gold}>
                  {perk.name}
                </Txt>
                <Txt variant="small">{perk.description}</Txt>
              </Pressable>
            );
          })}
        </Card>
      ) : null}

      {character.perks.length > 0 ? (
        <Txt variant="small" center>
          Умения: {character.perks.map((id) => PERKS_BY_ID[id as PerkId]?.name ?? id).join(' · ')}
        </Txt>
      ) : null}
      {claimable > 0 ? (
        <Pressable onPress={openStats} accessibilityRole="button" accessibilityLabel="Достижения">
          <Txt variant="small" center color={colors.gold}>
            Достижения ждут награды: {claimable}. Открой цифры, чтобы забрать.
          </Txt>
        </Pressable>
      ) : null}

      <Pressable onPress={() => router.push('/boutique')} accessibilityRole="button" accessibilityLabel="Лавка князя">
        <Txt variant="small" center color={colors.textMuted}>
          Лавка князя · {character.seals} печ.{character.cosmetics.owned.length > 0 ? ` · куплено ${character.cosmetics.owned.length}` : ' · рамки, прозвища, эмблемы'}
        </Txt>
      </Pressable>

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

      <View style={styles.footer}>
        <Pressable
          onPress={() => {
            setSound(!sound);
            if (!sound) playSfx('coin');
          }}
          accessibilityRole="button"
          accessibilityLabel={sound ? 'Выключить звук' : 'Включить звук'}
          style={styles.service}>
          <Txt variant="small" center color={colors.textDim}>
            {sound ? 'Звук: вкл' : 'Звук: выкл'}
          </Txt>
        </Pressable>
        <Pressable onPress={() => router.push('/admin')} accessibilityRole="button" accessibilityLabel="Служебный вход" style={styles.service}>
          <Txt variant="small" center color={account.gmUnlocked ? colors.red : colors.textDim}>
            {account.gmUnlocked ? `Режим мастера: ${ROLE_LABELS[account.role]}` : 'Служебный вход'}
          </Txt>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  service: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
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
  perkCard: { borderColor: colors.gold, borderWidth: 2 },
  perkOption: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldDim,
    backgroundColor: colors.bgElevated,
    gap: 2,
  },
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
