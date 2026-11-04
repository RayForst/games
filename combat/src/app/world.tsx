import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';

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
          <Terrain w={W} h={H} />
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

/**
 * Декоративный рельеф: река через карту, холмы у города, ели у леса, камыш у болота,
 * горы у перевала, стены у руин. Чистая геометрия, никаких картинок.
 */
function Terrain({ w, h }: { w: number; h: number }) {
  const p = (x: number, y: number) => `${(x * w).toFixed(1)},${(y * h).toFixed(1)}`;
  const trees = [
    [0.08, 0.14], [0.14, 0.1], [0.3, 0.12], [0.1, 0.42], [0.3, 0.4], [0.36, 0.22], [0.2, 0.5], [0.05, 0.28],
  ];
  const reeds = [0.7, 0.74, 0.78, 0.86, 0.9, 0.94];
  return (
    <>
      {/* река: с севера на юг, огибает город */}
      <Path
        d={`M ${p(0.62, 0)} C ${p(0.55, 0.2)} ${p(0.72, 0.35)} ${p(0.64, 0.5)} S ${p(0.5, 0.75)} ${p(0.58, 1)}`}
        stroke="#2a3a4a"
        strokeWidth={14}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d={`M ${p(0.62, 0)} C ${p(0.55, 0.2)} ${p(0.72, 0.35)} ${p(0.64, 0.5)} S ${p(0.5, 0.75)} ${p(0.58, 1)}`}
        stroke="#3c5570"
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="2 10"
      />
      {/* мост у города */}
      <Rect x={w * 0.58} y={h * 0.5} width={w * 0.1} height={6} fill={colors.goldDim} rx={2} />
      {/* холмы вокруг города */}
      <Ellipse cx={w * 0.42} cy={h * 0.66} rx={w * 0.12} ry={h * 0.035} fill="#2a2118" />
      <Ellipse cx={w * 0.55} cy={h * 0.7} rx={w * 0.1} ry={h * 0.03} fill="#241c15" />
      {/* ели у леса */}
      {trees.map(([x, y], i) => (
        <Polygon key={i} points={`${p(x, y - 0.045)} ${p(x - 0.022, y)} ${p(x + 0.022, y)}`} fill="#1f2b1c" stroke="#2f4428" strokeWidth={1} />
      ))}
      {/* камыш у болота */}
      {reeds.map((x, i) => (
        <Line key={i} x1={w * x} y1={h * 0.12} x2={w * (x + 0.005)} y2={h * (0.12 - 0.05)} stroke="#4a5a30" strokeWidth={2} strokeLinecap="round" />
      ))}
      <Ellipse cx={w * 0.8} cy={h * 0.14} rx={w * 0.14} ry={h * 0.03} fill="#1b2416" opacity={0.8} />
      {/* горы у перевала */}
      <Polygon points={`${p(0.05, 0.98)} ${p(0.14, 0.72)} ${p(0.23, 0.98)}`} fill="#2c2a2a" stroke="#4a4646" strokeWidth={1} />
      <Polygon points={`${p(0.16, 0.98)} ${p(0.27, 0.68)} ${p(0.38, 0.98)}`} fill="#332f2f" stroke="#4a4646" strokeWidth={1} />
      <Polygon points={`${p(0.235, 0.72)} ${p(0.27, 0.68)} ${p(0.305, 0.72)}`} fill="#8a8a8a" />
      {/* стены руин */}
      <Rect x={w * 0.68} y={h * 0.9} width={w * 0.05} height={h * 0.035} fill="#3a3330" />
      <Rect x={w * 0.86} y={h * 0.88} width={w * 0.03} height={h * 0.055} fill="#3a3330" />
      <Rect x={w * 0.74} y={h * 0.93} width={w * 0.14} height={h * 0.012} fill="#2e2926" />
    </>
  );
}

const styles = StyleSheet.create({
  map: { alignSelf: 'center', borderRadius: radius.lg, overflow: 'hidden' },
  node: { position: 'absolute', width: NODE * 2, height: NODE * 2, alignItems: 'center', justifyContent: 'center' },
  nodeLabel: {
    position: 'absolute',
    top: NODE * 2 + 2,
    left: -36,
    width: NODE * 2 + 72,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    paddingHorizontal: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(20, 16, 12, 0.8)',
    overflow: 'hidden',
  },
});
