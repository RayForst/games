import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Txt } from './Txt';
import { BUILDINGS, BUILDINGS_BY_ID, MAP_IMAGE_SIZE, type Building, type BuildingId } from '@/game';
import { colors, radius } from '@/ui/theme';

const MAP_IMAGE = require('../../assets/map/city.webp');

const PILL_W = 112;

interface Props {
  selected: BuildingId;
  onSelect: (id: BuildingId) => void;
  /** Короткий статус под названием: «4 соперника», «вернётся через 1:20». */
  status?: Partial<Record<BuildingId, string>>;
  height: number;
}

/**
 * Горизонтальная карта города. Картинка шире экрана, листается пальцем,
 * поверх неё стоят кнопки-заведения в нормированных координатах.
 */
export function CityMap({ selected, onSelect, status = {}, height }: Props) {
  const { width: screenW } = useWindowDimensions();
  const width = Math.round(height * (MAP_IMAGE_SIZE.width / MAP_IMAGE_SIZE.height));
  const ref = useRef<ScrollView>(null);

  const centerOn = (id: BuildingId) => Math.max(0, Math.min(width - screenW, BUILDINGS_BY_ID[id].x * width - screenW / 2));

  // Камера плавно едет к выбранному зданию; при первом рендере contentOffset уже стоит там же.
  useEffect(() => {
    ref.current?.scrollTo({ x: centerOn(selected), animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, width, screenW]);

  return (
    <ScrollView
      ref={ref}
      horizontal
      bounces={false}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      contentOffset={{ x: centerOn(selected), y: 0 }}
      contentContainerStyle={{ width, height }}
      // ScrollView по умолчанию flexGrow: 1 — без этого карта растягивается тёмным фоном вниз.
      style={{ height, flexGrow: 0 }}>
      <Image source={MAP_IMAGE} style={{ width, height }} resizeMode="cover" accessibilityLabel="Карта города" />
      {BUILDINGS.map((b) => (
        <Marker
          key={b.id}
          building={b}
          active={b.id === selected}
          status={status[b.id]}
          left={b.x * width - PILL_W / 2}
          top={b.y * height}
          onPress={() => onSelect(b.id)}
        />
      ))}
    </ScrollView>
  );
}

function Marker({
  building,
  active,
  status,
  left,
  top,
  onPress,
}: {
  building: Building;
  active: boolean;
  status?: string;
  left: number;
  top: number;
  onPress: () => void;
}) {
  const closed = !building.open;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={building.name}
      style={({ pressed }) => [styles.marker, { left, top }, pressed && styles.pressed]}>
      <View style={[styles.pin, active && styles.pinActive, closed && styles.pinClosed]} />
      <View style={[styles.pill, active && styles.pillActive, closed && styles.pillClosed]}>
        <View style={styles.pillRow}>
          {closed ? <Ionicons name="lock-closed" size={11} color={active ? colors.black : colors.textMuted} /> : null}
          <Txt variant="small" bold color={active ? colors.black : colors.text} numberOfLines={1}>
            {building.name}
          </Txt>
        </View>
        {status ? (
          <Txt variant="small" color={active ? colors.black : colors.textMuted} numberOfLines={1} style={styles.status}>
            {status}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  marker: { position: 'absolute', width: PILL_W, alignItems: 'center' },
  pressed: { opacity: 0.8 },
  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: colors.gold,
    backgroundColor: colors.bg,
    marginBottom: 4,
  },
  pinActive: { backgroundColor: colors.gold, transform: [{ scale: 1.25 }] },
  pinClosed: { borderColor: colors.textDim },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(20, 16, 12, 0.88)',
    borderWidth: 1,
    borderColor: colors.goldDim,
    alignItems: 'center',
    maxWidth: PILL_W,
  },
  pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillClosed: { borderColor: colors.border },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { fontSize: 11, lineHeight: 14 },
});
