import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CityMap } from '@/components/CityMap';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { BUILDINGS_BY_ID, CITY_START, deriveCharacter, healCost, mineIsDone, mineSecondsLeft, type BuildingId } from '@/game';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { formatDuration, plural } from '@/ui/format';
import { colors, spacing } from '@/ui/theme';

const ROUTES: Partial<Record<BuildingId, '/arena' | '/shop' | '/healer' | '/mine'>> = {
  arena: '/arena',
  shop: '/shop',
  healer: '/healer',
  mine: '/mine',
};

/** Хаб игры: карта города, по тапу на здание — его экран. */
export default function CityScreen() {
  const character = useGame((s) => s.character);
  const arena = useGame((s) => s.arena);
  const mining = useGame((s) => s.mining);
  const now = useNow();
  const { height: screenH } = useWindowDimensions();
  const [selected, setSelected] = useState<BuildingId>(CITY_START);

  if (!character) return null;

  const derived = deriveCharacter(character);
  const building = BUILDINGS_BY_ID[selected];
  const mapHeight = Math.round(Math.min(380, Math.max(240, screenH * 0.4)));

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
    <Screen scroll={false} padded={false}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title">Город</Txt>
        </View>
        <View style={styles.headerRight}>
          <Txt bold numberOfLines={1}>
            {character.name}
          </Txt>
          <Txt variant="small">
            {character.level} ур. · {character.hp}/{derived.maxHp} hp · {character.kredits} кр.
          </Txt>
        </View>
      </View>

      <CityMap
        selected={selected}
        onSelect={(id) => (id === selected ? enter() : setSelected(id))}
        status={status}
        height={mapHeight}
      />

      <View style={styles.info}>
        <Card title={building.name} right={<Txt variant="small">{status[selected]}</Txt>}>
          <Txt variant="muted">{building.description}</Txt>
          <Button title={action} onPress={enter} disabled={!building.open} />
        </Card>
        <Txt variant="small" center color={colors.textDim} style={styles.hint}>
          Листай карту пальцем. Нажми на здание ещё раз, чтобы войти.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerRight: { alignItems: 'flex-end', flexShrink: 1 },
  info: { padding: spacing.lg, gap: spacing.md, flex: 1 },
  hint: { marginTop: 'auto' },
});
