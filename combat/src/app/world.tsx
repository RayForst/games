import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { BackBar } from '@/components/BackBar';
import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GiIcon } from '@/components/GiIcon';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { canTravel, locationOpen, LOCATIONS, LOCATIONS_BY_ID, routeBetween, travelProgress, travelSecondsLeft, type LocationId } from '@/game';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { formatDuration } from '@/ui/format';
import { colors, radius, spacing } from '@/ui/theme';

const NODE = 30;

/** Карта мира: локации, дороги, маркер игрока. Пока без картинки — схема на SVG, чтобы заложить механику. */
export default function WorldScreen() {
  const character = useGame((s) => s.character);
  const travel = useGame((s) => s.travel);
  const mining = useGame((s) => s.mining);
  const gathering = useGame((s) => s.gathering);
  const fight = useGame((s) => s.fight);
  const startTravel = useGame((s) => s.startTravel);
  const now = useNow();
  const { width: screenW } = useWindowDimensions();
  const [selected, setSelected] = useState<LocationId | null>(null);

  if (!character) return null;

  const W = Math.min(screenW - spacing.lg * 2, 520);
  const H = Math.round(W * 1.1);
  const px = (id: LocationId) => ({ x: LOCATIONS_BY_ID[id].x * W, y: LOCATIONS_BY_ID[id].y * H });

  const here = character.location;
  const busy = { mining: !!mining, gathering: !!gathering, traveling: !!travel, fighting: fight?.status === 'active' };

  // Маркер игрока: на локации или на дороге, пропорционально пройденному.
  let marker = px(here);
  if (travel) {
    const a = px(travel.from);
    const b = px(travel.to);
    const p = travelProgress(travel, now);
    marker = { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
  }

  const sel = selected ? LOCATIONS_BY_ID[selected] : null;
  const check = selected ? canTravel(character, selected, busy) : null;
  const route = selected ? routeBetween(here, selected) : null;

  const go = () => {
    if (!selected) return;
    const r = startTravel(selected);
    if (!r.ok) Alert.alert('Дорога', r.reason ?? 'Не получилось');
  };

  return (
    <Screen>
      <BackBar title="Назад" />
      <View>
        <Txt variant="title">Карта мира</Txt>
        <Txt variant="muted">Нажми на место, чтобы узнать дорогу. Путь занимает время, как и всё в этом княжестве.</Txt>
      </View>

      <View style={[styles.map, { width: W, height: H }]}>
        <Svg width={W} height={H}>
          <Rect x={0} y={0} width={W} height={H} rx={radius.lg} fill={colors.bgElevated} />
          {LOCATIONS.flatMap((l) =>
            LOCATIONS.filter((m) => m.id > l.id)
              .map((m) => ({ m, r: routeBetween(l.id, m.id) }))
              .filter(({ r }) => r)
              .map(({ m }) => {
                const a = px(l.id);
                const b = px(m.id);
                const open = locationOpen(l.id, character.level) && locationOpen(m.id, character.level);
                return (
                  <Line
                    key={`${l.id}-${m.id}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={open ? colors.goldDim : colors.border}
                    strokeWidth={3}
                    strokeDasharray="8 6"
                  />
                );
              }),
          )}
          {LOCATIONS.map((l) => {
            const p = px(l.id);
            const active = l.id === selected;
            const open = locationOpen(l.id, character.level);
            return (
              <Circle
                key={l.id}
                cx={p.x}
                cy={p.y}
                r={NODE}
                fill={colors.card}
                stroke={active ? colors.gold : open ? colors.goldDim : colors.border}
                strokeWidth={active ? 3 : 2}
              />
            );
          })}
          <Circle cx={marker.x} cy={marker.y} r={travel ? 8 : NODE + 6} fill={travel ? colors.gold : 'none'} stroke={colors.gold} strokeWidth={travel ? 0 : 2} />
        </Svg>
        {LOCATIONS.map((l) => {
          const p = px(l.id);
          const open = locationOpen(l.id, character.level);
          return (
            <Pressable
              key={l.id}
              onPress={() => setSelected(l.id)}
              accessibilityRole="button"
              accessibilityLabel={`Место: ${l.name}`}
              style={[styles.node, { left: p.x - NODE, top: p.y - NODE }]}>
              <GiIcon name={l.icon} size={28} color={open ? colors.gold : colors.textDim} />
              <Txt variant="small" bold color={open ? colors.text : colors.textDim} style={styles.nodeLabel} numberOfLines={1}>
                {open ? l.name : `${l.name} · ${l.minLevel} ур.`}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {travel ? (
        <Card title={`В пути: ${LOCATIONS_BY_ID[travel.from].name} → ${LOCATIONS_BY_ID[travel.to].name}`}>
          <Bar value={travelProgress(travel, now) * 100} max={100} color={colors.gold} height={8} showNumbers={false} label={`Осталось ${formatDuration(travelSecondsLeft(travel, now))}`} />
          <Txt variant="small">Дорога сама себя не пройдёт. Можно закрыть игру: придёшь по часам.</Txt>
        </Card>
      ) : sel ? (
        <Card title={sel.name} right={<Txt variant="small">{sel.id === here ? 'ты здесь' : route ? `${route.minutes} мин пути` : 'дороги нет'}</Txt>}>
          <Txt variant="muted">{sel.description}</Txt>
          {sel.id === here ? (
            <Button title="Открыть" onPress={() => router.back()} variant="secondary" />
          ) : (
            <Button title={route ? `Идти · ${route.minutes} мин` : 'Нет дороги'} onPress={go} disabled={!check?.ok} />
          )}
          {check && !check.ok && sel.id !== here ? (
            <Txt variant="small" color={colors.red}>
              {check.reason}
            </Txt>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Txt variant="muted" center>
            Ты в: {LOCATIONS_BY_ID[here].name}. Выбери, куда идти.
          </Txt>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { alignSelf: 'center', borderRadius: radius.lg, overflow: 'hidden' },
  node: { position: 'absolute', width: NODE * 2, height: NODE * 2, alignItems: 'center', justifyContent: 'center' },
  nodeLabel: { position: 'absolute', top: NODE * 2 + 2, width: 96, textAlign: 'center', fontSize: 11, lineHeight: 14 },
});
