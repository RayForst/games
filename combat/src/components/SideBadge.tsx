import { StyleSheet, View } from 'react-native';

import { Txt } from './Txt';
import { SIDES_BY_ID, type SideId } from '@/game';
import { radius, sideColors } from '@/ui/theme';

interface Props {
  side: SideId | null | undefined;
  /** Полное имя стороны вместо одной буквы. */
  full?: boolean;
}

/** Метка стороны: цветная буква «К»/«В» или полное имя. Ничейным (зверям) не показывается. */
export function SideBadge({ side, full }: Props) {
  if (!side) return null;
  const color = sideColors[side];
  const def = SIDES_BY_ID[side];
  return (
    <View style={[styles.badge, { borderColor: color }]} accessibilityLabel={def.name}>
      <Txt variant="small" bold color={color} style={styles.text}>
        {full ? def.name : def.name[0]}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { lineHeight: 14, fontSize: 11 },
});
