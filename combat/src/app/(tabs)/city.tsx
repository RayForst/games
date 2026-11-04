import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CityMap } from '@/components/CityMap';
import { BrodHub } from '@/components/BrodHub';
import { GiIcon } from '@/components/GiIcon';
import { TravelHub } from '@/components/TravelHub';
import { WildsHub } from '@/components/WildsHub';
import { Txt } from '@/components/Txt';
import { activeInjury, BUILDINGS_BY_ID, CITY_START, dayKey, deriveCharacter, healCost, isWild, mineIsDone, mineSecondsLeft, questDone, unreadCount, wornItems, type BuildingId } from '@/game';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { formatDuration, plural } from '@/ui/format';
import { colors, radius, spacing } from '@/ui/theme';

const ROUTES: Partial<Record<BuildingId, '/arena' | '/shop' | '/healer' | '/mine' | '/smithy' | '/tavern' | '/castle'>> = {
  arena: '/arena',
  shop: '/shop',
  healer: '/healer',
  mine: '/mine',
  smithy: '/smithy',
  tavern: '/tavern',
  castle: '/castle',
};

// На коротких экранах (iPhone SE) панель внизу иначе наезжает на нижние заведения — подсказку убираем.
const SHORT_SCENE = 700;
const SCRIM = 'rgba(20, 16, 12, 0)';
const SCRIM_DARK = 'rgba(20, 16, 12, 0.85)';

/** Таб «место»: город, лес или дорога — смотря где персонаж. */
export default function PlaceScreen() {
  const location = useGame((s) => s.character?.location ?? 'city');
  const traveling = useGame((s) => !!s.travel);
  if (traveling) return <TravelHub />;
  if (isWild(location)) return <WildsHub wild={location} />;
  if (location === 'brod') return <BrodHub />;
  return <CityScreen />;
}

/** Хаб города: карта на всю сцену, поверх неё шапка и панель выбранного заведения. */
function CityScreen() {
  const character = useGame((s) => s.character);
  const arena = useGame((s) => s.arena);
  const mining = useGame((s) => s.mining);
  const quests = useGame((s) => s.quests);
  const tournament = useGame((s) => s.tournament);
  const roadNews = useGame((s) => s.roadNews);
  const dismissRoadNews = useGame((s) => s.dismissRoadNews);
  const unread = useGame((s) => unreadCount(s.chat, s.chatSeenAt));
  const now = useNow();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<BuildingId>(CITY_START);
  // Размер сцены узнаём по факту: табы и статус-бар отъедают разное на разных телефонах.
  const [scene, setScene] = useState<{ width: number; height: number } | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setScene((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };

  if (!character) return null;

  const derived = deriveCharacter(character);
  const building = BUILDINGS_BY_ID[selected];

  const status: Partial<Record<BuildingId, string>> = {
    arena: mining ? 'ты в шахте' : `${arena.length} ${plural(arena.length, ['соперник', 'соперника', 'соперников'])}`,
    shop: `${character.kredits} кр.`,
    healer: activeInjury(character, now) ? 'травма' : character.hp >= derived.maxHp ? 'ты здоров' : `${healCost(character)} кр.`,
    mine: mining ? (mineIsDone(mining, now) ? 'смена окончена' : `ещё ${formatDuration(mineSecondsLeft(mining, now))}`) : 'свободна',
    smithy: wornItems(character).length > 0 ? `${wornItems(character).length} ${plural(wornItems(character).length, ['вещь изношена', 'вещи изношены', 'вещей изношено'])}` : 'всё цело',
    tavern: questStatus(),
    castle: castleStatus(),
  };

  function castleStatus(): string {
    const t = tournament && tournament.day === dayKey(now) ? tournament : null;
    if (!t) return character?.lastTournamentDay === dayKey(now) ? 'турнир завтра' : 'турнир сегодня';
    if (t.status === 'active') return `бой ${t.stage + 1} из 4`;
    return t.status === 'won' ? 'ты чемпион' : 'выбыл, завтра';
  }

  function questStatus(): string {
    if (!quests || quests.day !== dayKey(now)) return 'новые задания';
    const claimable = quests.quests.filter((q) => questDone(q) && !q.claimed).length;
    if (claimable > 0) return `награда: ${claimable}`;
    const done = quests.quests.filter((q) => q.claimed).length;
    return `задания ${done}/${quests.quests.length}`;
  }

  const enter = () => {
    const route = ROUTES[selected];
    if (route) router.push(route);
  };

  // Пока идёт смена, в шахту заходят не работать, а проверить и забрать.
  const action = selected === 'mine' && mining ? 'Проверить' : building.action;

  return (
    <View style={styles.root} onLayout={onLayout}>
      {scene ? (
        <CityMap
          selected={selected}
          onSelect={(id) => (id === selected ? enter() : setSelected(id))}
          status={status}
          width={scene.width}
          height={scene.height}
        />
      ) : null}

      <LinearGradient colors={[SCRIM_DARK, SCRIM]} style={[styles.topScrim, { height: insets.top + 110 }]} pointerEvents="none" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <View style={styles.flex}>
          <Txt variant="title" style={styles.shadow}>
            Город
          </Txt>
          <View style={styles.links}>
            <Pressable onPress={() => router.push('/world')} accessibilityRole="button" accessibilityLabel="Карта мира" style={styles.mapLink}>
              <GiIcon name="road" size={16} />
              <Txt variant="small" color={colors.gold} style={styles.shadow}>
                Карта мира
              </Txt>
            </Pressable>
            <Pressable onPress={() => router.push('/chat')} accessibilityRole="button" accessibilityLabel="Чат" style={styles.mapLink}>
              <GiIcon name="chat" size={16} />
              <Txt variant="small" color={colors.gold} style={styles.shadow}>
                Чат{unread > 0 ? ` · ${unread}` : ''}
              </Txt>
            </Pressable>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Txt bold numberOfLines={1} style={styles.shadow}>
            {character.name}
          </Txt>
          <Txt variant="small" color={colors.text} style={styles.shadow}>
            {character.level} ур. · {character.hp}/{derived.maxHp} hp · {character.kredits} кр.
          </Txt>
        </View>
      </View>

      <View style={styles.bottom} pointerEvents="box-none">
        <LinearGradient colors={[SCRIM, SCRIM_DARK]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        {roadNews ? (
          <Pressable onPress={dismissRoadNews} accessibilityRole="button" accessibilityLabel="Дорожные вести" style={styles.news}>
            <GiIcon name="event" size={20} />
            <Txt variant="small" style={styles.flex}>
              {roadNews}
            </Txt>
          </Pressable>
        ) : null}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Txt variant="heading">{building.name}</Txt>
            <Txt variant="small">{status[selected]}</Txt>
          </View>
          <Txt variant="muted">{building.description}</Txt>
          <Button title={action} onPress={enter} disabled={!building.open} />
        </View>
        {scene && scene.height >= SHORT_SCENE ? (
          <Txt variant="small" center numberOfLines={1} style={styles.shadow}>
            Листай карту пальцем. Второй тап по зданию — вход.
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  headerRight: { alignItems: 'flex-end', flexShrink: 1 },
  links: { flexDirection: 'row', gap: spacing.md },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  shadow: { textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  panel: {
    backgroundColor: 'rgba(20, 16, 12, 0.9)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  news: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(20, 16, 12, 0.9)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: spacing.sm,
  },
});
