import { type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GI, type GiName } from '@/ui/gi.generated';
import { colors } from '@/ui/theme';

interface Props {
  name: GiName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Монохромная иконка из набора Game Icons (CC BY 3.0) — заглушка там, где своей картинки ещё нет. */
export function GiIcon({ name, size = 24, color = colors.gold, style }: Props) {
  const def = GI[name];
  if (!def) return null;
  return (
    <Svg width={size} height={size} viewBox={def.viewBox} style={style}>
      {def.paths.map((d, i) => (
        <Path key={i} d={d} fill={color} />
      ))}
    </Svg>
  );
}
