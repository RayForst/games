import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CityMap } from '@/components/CityMap';
import { Txt } from '@/components/Txt';
import { BUILDINGS_BY_ID, CITY_START, deriveCharacter, healCost, mineIsDone, mineSecondsLeft, type BuildingId } from '@/game';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { formatDuration, plural } from '@/ui/format';
import { colors, radius, spacing } from '@/ui/theme';

const ROUTES: Partial<Record<BuildingId, '/arena' | '/shop' | '/healer' | '/mine'>> = {
  arena: '/arena',
  shop: '/shop',
  healer: '/healer',
  mine: '/mine',
};

// На коротких экранах (iPhone SE) панель внизу иначе наезжает на нижние заведения — подсказку убираем.
const SHORT_SCENE = 700;
const SCRIM = 'rgba(20, 16, 12, 0)';
const SCRIM_DARK = 'rgba(20, 16, 12, 0.85)';

/** Хаб игры: карта города на всю сцену, поверх неё шапка и панель выбранного заведения. */
export default function CityScreen() {
  const character = useGame((s) => s.character);
  const arena = useGame((s) => s.arena);
  const mining = useGame((s) => s.mining);
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
    healer: character.hp >= derived.maxHp ? 'ты здоров' : `${healCost(character)} кр.`,
    mine: mining ? (mineIsDone(mining, now) ? 'смена окончена' : `ещё ${formatDuration(mineSecondsLeft(mining, now))}`) : 'свободна',
    smithy: 'скоро',
    tavern: 'скоро',
  };

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
});
