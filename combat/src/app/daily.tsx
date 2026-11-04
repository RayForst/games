import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Flash } from '@/components/Flash';
import { GiIcon } from '@/components/GiIcon';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import {
  activeEvent,
  CHEST_KINDS,
  CHESTS,
  DAILY_CHAIN,
  DAILY_DAYS,
  dailyClaimed,
  dayKey,
  lootIsRare,
  lootText,
  nextDailyDay,
  normalizeChests,
  STREAK_STEPS,
  streakBonusMult,
  upcomingEvents,
  weekDaysLeft,
  weeklyChest,
  weeklyDone,
  weeklyTitle,
  type ChestKind,
  type ChestLoot,
  type EventId,
} from '@/game';
import type { GiName } from '@/ui/gi.generated';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { playSfx } from '@/ui/sfx';
import { colors, radius, spacing } from '@/ui/theme';

const EVENT_ICONS: Record<EventId, GiName> = { fair: 'trade', hunt: 'boar', guard: 'crown', plague: 'skull', thieves: 'dagger' };
const DAY_ICONS: GiName[] = ['coins', 'herbs', 'potion', 'coins', 'wood', 'backpack', 'chest'];
const CHEST_COLORS: Record<ChestKind, string> = { wooden: colors.textMuted, bound: colors.blue, princely: colors.gold };

interface Reveal {
  key: number;
  /** Под какой карточкой показать: награда дня или сундуки. */
  where: 'daily' | 'chest';
  title: string;
  loot: ChestLoot[];
}

/** Строки добычи раскрываются по одной: простая Animated-лесенка, без reanimated. */
function LootReveal({ title, loot }: { title: string; loot: ChestLoot[] }) {
  const [anims] = useState(() => loot.map(() => new Animated.Value(0)));
  useEffect(() => {
    Animated.stagger(
      380,
      anims.map((a) => Animated.timing(a, { toValue: 1, duration: 420, useNativeDriver: false })),
    ).start();
  }, [anims]);
  return (
    <View style={styles.reveal}>
      <View style={styles.revealHead}>
        <GiIcon name="chest-open" size={26} />
        <Txt bold color={colors.gold}>
          {title}
        </Txt>
      </View>
      {loot.map((l, i) => {
        const a = anims[i];
        const rare = lootIsRare(l);
        return (
          <Animated.View
            key={i}
            style={[styles.lootRow, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>
            <Txt color={rare ? colors.gold : colors.text} bold={rare}>
              {rare ? '★ ' : '• '}
              {lootText(l)}
            </Txt>
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Календарь: событие княжества, награда за вход по дням, цели недели от писаря и сундуки. */
export default function DailyScreen() {
  const character = useGame((s) => s.character);
  const daily = useGame((s) => s.daily);
  const ensureWeekly = useGame((s) => s.ensureWeekly);
  const claimDaily = useGame((s) => s.claimDaily);
  const claimWeekly = useGame((s) => s.claimWeekly);
  const openChest = useGame((s) => s.openChest);
  const [flash, show] = useFlash(2500);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  // Доска недели создаётся при входе (и пересоздаётся в понедельник).
  useEffect(() => {
    ensureWeekly();
  }, [ensureWeekly]);

  if (!character) return null;

  const today = dayKey();
  const ev = activeEvent(today);
  const coming = upcomingEvents(today).filter((x) => x.startsIn > 0).slice(0, 2);
  const claimed = dailyClaimed(daily, today);
  const dayNo = nextDailyDay(daily, today);
  const chests = normalizeChests(character.chests);
  const weekly = daily.weekly;
  const streak = character.ledger.streak;
  const streakMult = streakBonusMult(streak);

  const onClaimDaily = () => {
    const r = claimDaily();
    if (!r.ok || !r.loot) {
      show(r.reason ?? 'Не получилось');
      return;
    }
    playSfx('coin');
    const loot = r.loot;
    const title = `День ${r.day}: ${DAILY_CHAIN[(r.day ?? 1) - 1].title}`;
    setReveal((prev) => ({ key: (prev?.key ?? 0) + 1, where: 'daily', title, loot }));
  };

  const onClaimWeekly = (id: string) => {
    const r = claimWeekly(id);
    if (r.ok && r.chest) playSfx('coin');
    show(r.ok && r.chest ? `${CHESTS[r.chest].name} — твой. Открой внизу.` : (r.reason ?? 'Не получилось'));
  };

  const onOpen = (kind: ChestKind) => {
    const r = openChest(kind);
    if (!r.ok || !r.loot) {
      show(r.reason ?? 'Не получилось');
      return;
    }
    playSfx('coin');
    const loot = r.loot;
    setReveal((prev) => ({ key: (prev?.key ?? 0) + 1, where: 'chest', title: CHESTS[kind].name, loot }));
  };

  return (
    <Screen>
      <BackBar right={<Kredits value={character.kredits} />} />
      <View>
        <Txt variant="title">Календарь</Txt>
        <Txt variant="muted">Писарь Гришка ведёт счёт дням. Кто ходит каждый день — тому и сундук.</Txt>
      </View>

      <Flash text={flash} />

      {/* Событие дня */}
      {ev ? (
        <Card style={styles.eventCard} title={ev.def.name} right={<GiIcon name={EVENT_ICONS[ev.def.id]} size={24} color={colors.red} />}>
          <Txt variant="muted">{ev.def.banner}</Txt>
          {ev.def.effects.map((e) => (
            <Txt key={e} variant="small" color={colors.gold}>
              · {e}
            </Txt>
          ))}
          <Txt variant="small">
            День {ev.dayOf} из {ev.def.days}
            {ev.daysLeft > 1 ? ` · ещё ${ev.daysLeft} дн.` : ' · последний день'}
          </Txt>
        </Card>
      ) : (
        <Card title="В княжестве тихо" right={<GiIcon name="event" size={24} color={colors.textMuted} />}>
          <Txt variant="muted">Ни ярмарки, ни чумы. Цены как цены, стража трезвая.</Txt>
        </Card>
      )}
      {coming.length > 0 ? (
        <Txt variant="small" center>
          Дальше: {coming.map((c) => `${c.def.name.toLowerCase()} через ${c.startsIn} дн.`).join(' · ')}
        </Txt>
      ) : null}

      {/* Награда за вход */}
      <Card title="Награда за вход" right={<Txt variant="small">{claimed ? 'завтра снова' : `день ${dayNo} из ${DAILY_DAYS}`}</Txt>}>
        <View style={styles.chain}>
          {DAILY_CHAIN.map((g, i) => {
            const n = i + 1;
            const done = claimed ? n <= daily.streak : n < dayNo;
            const current = claimed ? n === daily.streak : n === dayNo;
            return (
              <View key={g.day} style={[styles.cell, done && styles.cellDone, current && styles.cellCurrent]}>
                <GiIcon name={DAY_ICONS[i]} size={18} color={current ? colors.gold : done ? colors.green : colors.textDim} />
                <Txt variant="small" bold={current} color={current ? colors.gold : done ? colors.green : colors.textDim}>
                  {n}
                </Txt>
              </View>
            );
          })}
        </View>
        <Txt variant="small">
          Сегодня: {DAILY_CHAIN[dayNo - 1].title.toLowerCase()}. Пропустил день — шаг назад, пропустил два — с начала.
        </Txt>
        {claimed ? (
          <Txt variant="small" color={colors.green}>
            Забрано. Приходи завтра за {dayNo >= DAILY_DAYS ? 'первым днём' : `днём ${dayNo + 1}`}.
          </Txt>
        ) : (
          <Button title="Забрать награду" onPress={onClaimDaily} />
        )}
      </Card>

      {reveal?.where === 'daily' ? <LootReveal key={reveal.key} title={reveal.title} loot={reveal.loot} /> : null}

      {/* Серия побед */}
      <Card title="Серия побед" right={<Txt variant="small">{streak > 0 ? `${streak} подряд` : 'нет'}</Txt>}>
        <Txt variant="small">
          {streakMult > 1 ? `Награда за победы сейчас ×${streakMult}. ` : ''}
          Пороги: {STREAK_STEPS.map((s) => `${s.wins} — ×${s.mult}`).join(', ')}. Поражение или ничья обрывают.
        </Txt>
      </Card>

      {/* Недельные цели */}
      <Card title="Цели недели" right={<Txt variant="small">ещё {weekDaysLeft()} дн.</Txt>}>
        {weekly?.goals.map((g) => {
          const done = weeklyDone(g);
          const chest = weeklyChest(g);
          return (
            <View key={g.id} style={[styles.goal, g.claimed && styles.goalClaimed]}>
              <View style={styles.goalHead}>
                <Txt bold style={styles.flex}>
                  {weeklyTitle(g)}
                </Txt>
                <GiIcon name="chest" size={18} color={CHEST_COLORS[chest]} />
              </View>
              <Bar value={g.progress} max={g.target} height={6} color={done ? colors.green : colors.gold} />
              <Txt variant="small" color={CHEST_COLORS[chest]}>
                {CHESTS[chest].name.toLowerCase()}
              </Txt>
              {g.claimed ? <Txt variant="small">Сундук выдан.</Txt> : done ? <Button small title="Забрать сундук" onPress={() => onClaimWeekly(g.id)} /> : null}
            </View>
          );
        })}
      </Card>

      {/* Сундуки */}
      <Card title="Сундуки" right={<GiIcon name="chest" size={22} />}>
        {CHEST_KINDS.map((k) => {
          const def = CHESTS[k];
          const n = chests[k];
          return (
            <View key={k} style={[styles.chestRow, n === 0 && styles.chestEmpty]}>
              <GiIcon name="chest" size={30} color={CHEST_COLORS[k]} />
              <View style={styles.flex}>
                <Txt bold color={CHEST_COLORS[k]}>
                  {def.name} · {n}
                </Txt>
                <Txt variant="small">{def.description}</Txt>
              </View>
              <Button small title="Открыть" variant={n > 0 ? 'primary' : 'secondary'} disabled={n === 0} onPress={() => onOpen(k)} />
            </View>
          );
        })}
        <Txt variant="small">Откуда берутся: седьмой день подряд, цели недели, редко — с побеждённого, в ярмарку — к дневной награде.</Txt>
      </Card>

      {reveal?.where === 'chest' ? <LootReveal key={reveal.key} title={reveal.title} loot={reveal.loot} /> : null}

      <Pressable onPress={() => router.push('/tavern')} accessibilityRole="button" accessibilityLabel="В пивную">
        <Txt variant="small" center color={colors.textDim}>
          Задания на день — у хозяйки Марфы в пивной.
        </Txt>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  eventCard: { borderColor: colors.redDim, borderWidth: 2 },
  chain: { flexDirection: 'row', gap: spacing.xs },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  cellDone: { borderColor: colors.green },
  cellCurrent: { borderColor: colors.gold, backgroundColor: colors.cardAlt },
  reveal: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.card,
    gap: spacing.xs,
  },
  revealHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  lootRow: { paddingVertical: 2 },
  goal: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    gap: spacing.xs,
  },
  goalClaimed: { opacity: 0.55 },
  goalHead: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  chestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chestEmpty: { opacity: 0.6 },
});
