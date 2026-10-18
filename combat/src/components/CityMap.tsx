import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Txt } from './Txt';
import { BUILDINGS, BUILDINGS_BY_ID, MAP_IMAGE_SIZE, type Building, type BuildingId } from '@/game';
import { colors, radius } from '@/ui/theme';

const MAP_IMAGE = require('../../assets/map/city.webp');

const PILL_W = 112;
const PIN = 14;

interface Props {
  selected: BuildingId;
  onSelect: (id: BuildingId) => void;
  /** Короткий статус под названием: «4 соперника», «вернётся через 1:20». */
  status?: Partial<Record<BuildingId, string>>;
  /** Размер сцены, которую карта закрывает целиком. */
  width: number;
  height: number;
}

/**
 * Карта города на всю сцену. Картинка масштабируется как `background-size: cover`: по высоте экрана,
 * лишняя ширина листается пальцем. Поверх неё стоят кнопки-заведения в нормированных координатах.
 */
export function CityMap({ selected, onSelect, status = {}, width: sceneW, height: sceneH }: Props) {
  // Масштаб по большей стороне: на телефоне картинка выше экрана не бывает, на широком экране
  // (планшет, браузер) лишнее по высоте обрезается по центру.
  const scale = Math.max(sceneW / MAP_IMAGE_SIZE.width, sceneH / MAP_IMAGE_SIZE.height);
  const imgW = Math.round(MAP_IMAGE_SIZE.width * scale);
  const imgH = Math.round(MAP_IMAGE_SIZE.height * scale);
  const offsetY = Math.round((sceneH - imgH) / 2);
  const ref = useRef<ScrollView>(null);

  const centerOn = (id: BuildingId) => Math.max(0, Math.min(imgW - sceneW, BUILDINGS_BY_ID[id].x * imgW - sceneW / 2));

  // Камера плавно едет к выбранному зданию; при первом рендере contentOffset уже стоит там же.
  useEffect(() => {
    ref.current?.scrollTo({ x: centerOn(selected), animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, imgW, sceneW]);

  return (
    <ScrollView
      ref={ref}
      horizontal
      bounces={false}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      contentOffset={{ x: centerOn(selected), y: 0 }}
      contentContainerStyle={{ width: imgW, height: sceneH }}
      style={{ width: sceneW, height: sceneH }}>
      <Image
        source={MAP_IMAGE}
        style={{ position: 'absolute', left: 0, top: offsetY, width: imgW, height: imgH }}
        resizeMode="cover"
        accessibilityLabel="Карта города"
      />
      {BUILDINGS.map((b) => (
        <Marker
          key={b.id}
          building={b}
          active={b.id === selected}
          status={status[b.id]}
          left={b.x * imgW - PILL_W / 2}
          // Табличка висит над точкой входа, чтобы не уезжать под панель внизу экрана.
          bottom={sceneH - (offsetY + b.y * imgH) - PIN / 2}
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
  bottom,
  onPress,
}: {
  building: Building;
  active: boolean;
  status?: string;
  left: number;
  bottom: number;
  onPress: () => void;
}) {
  const closed = !building.open;
  const fg = active ? colors.black : colors.text;
  const fgMuted = active ? colors.black : colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={building.name}
      style={({ pressed }) => [styles.marker, { left, bottom }, pressed && styles.pressed]}>
      <View style={[styles.pill, active && styles.pillActive, closed && styles.pillClosed]}>
        <View style={styles.pillRow}>
          {closed ? <Ionicons name="lock-closed" size={11} color={fgMuted} /> : null}
          <Txt variant="small" bold color={fg} numberOfLines={1}>
            {building.name}
          </Txt>
        </View>
        {status ? (
          <Txt variant="small" color={fgMuted} numberOfLines={1} style={styles.status}>
            {status}
          </Txt>
        ) : null}
      </View>
      <View style={[styles.tail, active && styles.tailActive]} />
      <View style={[styles.pin, active && styles.pinActive, closed && styles.pinClosed]} />
    </Pressable>
  );
}

const PILL_BG = 'rgba(20, 16, 12, 0.88)';

const styles = StyleSheet.create({
  marker: { position: 'absolute', width: PILL_W, alignItems: 'center' },
  pressed: { opacity: 0.8 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: PILL_BG,
    borderWidth: 1,
    borderColor: colors.goldDim,
    alignItems: 'center',
    maxWidth: PILL_W,
  },
  pillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  pillClosed: { borderColor: colors.border },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { fontSize: 11, lineHeight: 14 },
  // Хвостик таблички: повёрнутый квадрат, наполовину спрятанный под табличкой.
  tail: {
    width: 10,
    height: 10,
    marginTop: -6,
    marginBottom: 4,
    backgroundColor: PILL_BG,
    transform: [{ rotate: '45deg' }],
  },
  tailActive: { backgroundColor: colors.gold },
  pin: {
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    borderWidth: 3,
    borderColor: colors.gold,
    backgroundColor: colors.bg,
  },
  pinActive: { backgroundColor: colors.gold, transform: [{ scale: 1.25 }] },
  pinClosed: { borderColor: colors.textDim },
});
