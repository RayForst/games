import { memo } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/ui/theme';
import { BLOCK_ZONES, ZONES, type Block, type Zone } from '@/game';

interface Props {
  /** Куда бьём — зона горит красным. */
  attack: Zone | null;
  /** Что закрываем — две соседние зоны под синим щитом. */
  block: Block | null;
  /** Высота одной зоны и зазор между ними — те же, что у плиток `ZonePicker`, чтобы зоны стояли в линию с кнопками. */
  row: number;
  gap: number;
  style?: StyleProp<ViewStyle>;
}

// Ширина фигуры в координатах viewBox; высота — пять полос по `row` с зазорами `gap`, один к одному с пикселями.
const W = 64;
const CX = W / 2;

/**
 * Силуэт бойца для выбора зон: голова, корпус, живот, пояс, ноги — пять полос, каждая на уровне своей плитки.
 * Декоративный: кнопками остаются плитки, фигура только показывает, что выбрано. Нарисован на SVG без картинок.
 */
export const BodyFigure = memo(function BodyFigure({ attack, block, row, gap, style }: Props) {
  const H = ZONES.length * row + (ZONES.length - 1) * gap;
  const top = (i: number) => i * (row + gap);
  const [y0, y1, y2, y3, y4] = ZONES.map((_, i) => top(i));
  const b = (i: number) => top(i) + row; // низ полосы
  const blocked = new Set<Zone>(block ? BLOCK_ZONES[block] : []);

  // Контуры зон. Голова — овал с шеей; корпус с плечами; живот сужается; пояс расходится в бёдра; ноги до колен.
  const shapes: Record<Zone, string> = {
    head: `M ${CX - 15} ${y0 + 21} C ${CX - 15} ${y0 + 6} ${CX - 8} ${y0 + 2} ${CX} ${y0 + 2} C ${CX + 8} ${y0 + 2} ${CX + 15} ${y0 + 6} ${CX + 15} ${y0 + 21} C ${CX + 15} ${y0 + 34} ${CX + 10} ${y0 + 42} ${CX + 5} ${y0 + 45} L ${CX + 6} ${b(0)} L ${CX - 6} ${b(0)} L ${CX - 5} ${y0 + 45} C ${CX - 10} ${y0 + 42} ${CX - 15} ${y0 + 34} ${CX - 15} ${y0 + 21} Z`,
    chest: `M ${CX - 7} ${y1} L ${CX + 7} ${y1} C ${CX + 16} ${y1 + 1} ${CX + 24} ${y1 + 4} ${CX + 24} ${y1 + 12} L ${CX + 21} ${b(1)} L ${CX - 21} ${b(1)} L ${CX - 24} ${y1 + 12} C ${CX - 24} ${y1 + 4} ${CX - 16} ${y1 + 1} ${CX - 7} ${y1} Z`,
    belly: `M ${CX - 21} ${y2} L ${CX + 21} ${y2} L ${CX + 18} ${b(2)} L ${CX - 18} ${b(2)} Z`,
    belt: `M ${CX - 18} ${y3} L ${CX + 18} ${y3} L ${CX + 22} ${b(3)} L ${CX - 22} ${b(3)} Z`,
    legs: `M ${CX - 22} ${y4} L ${CX - 2} ${y4} L ${CX - 3} ${b(4)} L ${CX - 19} ${b(4)} Z M ${CX + 2} ${y4} L ${CX + 22} ${y4} L ${CX + 19} ${b(4)} L ${CX + 3} ${b(4)} Z`,
  };

  const base = colors.borderStrong;
  const baseDark = colors.border;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={style} pointerEvents="none" accessible={false} aria-hidden>
      {/* Руки — не зоны, просто чтобы силуэт читался. */}
      <Path d={`M ${CX - 24} ${y1 + 10} C ${CX - 30} ${y1 + 30} ${CX - 31} ${y2 + 20} ${CX - 29} ${b(2) + 8} L ${CX - 23} ${b(2) + 6} C ${CX - 25} ${y2 + 20} ${CX - 24} ${y1 + 30} ${CX - 21} ${y1 + 14} Z`} fill={baseDark} />
      <Path d={`M ${CX + 24} ${y1 + 10} C ${CX + 30} ${y1 + 30} ${CX + 31} ${y2 + 20} ${CX + 29} ${b(2) + 8} L ${CX + 23} ${b(2) + 6} C ${CX + 25} ${y2 + 20} ${CX + 24} ${y1 + 30} ${CX + 21} ${y1 + 14} Z`} fill={baseDark} />
      <Ellipse cx={CX - 26} cy={b(2) + 8} rx={4} ry={5} fill={baseDark} />
      <Ellipse cx={CX + 26} cy={b(2) + 8} rx={4} ry={5} fill={baseDark} />

      {ZONES.map((z) => {
        const hit = attack === z;
        const shield = blocked.has(z);
        const fill = hit ? colors.red : shield ? colors.blue : base;
        return (
          <G key={z}>
            <Path d={shapes[z]} fill={fill} opacity={hit ? 0.95 : shield ? 0.75 : 1} stroke={hit ? colors.gold : shield ? colors.blue : baseDark} strokeWidth={hit ? 1.6 : 1} strokeLinejoin="round" />
            {/* Щит: светлая кромка по левому краю зоны, как край щита. */}
            {shield ? <Rect x={CX - 27} y={top(ZONES.indexOf(z)) + 2} width={3} height={row - 4} rx={1.5} fill={colors.blue} opacity={0.9} /> : null}
            {/* Прицел на зоне удара. */}
            {hit ? (
              <G opacity={0.9}>
                <Ellipse cx={CX} cy={top(ZONES.indexOf(z)) + row / 2} rx={7} ry={7} fill="none" stroke={colors.gold} strokeWidth={1.2} />
                <Path d={`M ${CX - 11} ${top(ZONES.indexOf(z)) + row / 2} h 6 M ${CX + 5} ${top(ZONES.indexOf(z)) + row / 2} h 6 M ${CX} ${top(ZONES.indexOf(z)) + row / 2 - 11} v 6 M ${CX} ${top(ZONES.indexOf(z)) + row / 2 + 5} v 6`} stroke={colors.gold} strokeWidth={1.2} />
              </G>
            ) : null}
          </G>
        );
      })}
      {/* Пряжка пояса и линия ремня, чтобы пояс читался как пояс. */}
      <Path d={`M ${CX - 18} ${y3 + 6} L ${CX + 18} ${y3 + 6}`} stroke={baseDark} strokeWidth={2} opacity={0.8} />
      <Rect x={CX - 3} y={y3 + 3} width={6} height={6} rx={1} fill={colors.gold} opacity={0.6} />
    </Svg>
  );
});
