import { Pressable, StyleSheet } from 'react-native';

import { GiIcon } from './GiIcon';
import { Txt } from './Txt';
import { canTravelHome, TOWNS_BY_ID } from '@/game';
import { useGame } from '@/store/useGame';
import { colors } from '@/ui/theme';

/**
 * «Домой»: быстрый путь в родной город одним переходом по кратчайшей дороге.
 * Показывается только тем, чей дом — не Город (там стартуют все), и не дома.
 */
export function HomeLink({ onError, shadow }: { onError?: (reason: string) => void; shadow?: boolean }) {
  const character = useGame((s) => s.character);
  const mining = useGame((s) => s.mining);
  const gathering = useGame((s) => s.gathering);
  const travel = useGame((s) => s.travel);
  const fighting = useGame((s) => s.fight?.status === 'active');
  const travelHome = useGame((s) => s.travelHome);
  if (!character || character.home === 'city' || character.home === character.location) return null;
  const check = canTravelHome(character, { mining: !!mining, gathering: !!gathering, traveling: !!travel, fighting });
  const minutes = check.route?.minutes;
  const home = TOWNS_BY_ID[character.home];
  return (
    <Pressable
      onPress={() => {
        const r = travelHome();
        if (!r.ok) onError?.(r.reason ?? 'Не получилось');
      }}
      accessibilityRole="button"
      accessibilityLabel={`Домой, в ${home.name}`}
      style={styles.link}>
      <GiIcon name="town" size={16} />
      <Txt variant="small" color={colors.gold} style={shadow ? styles.shadow : undefined}>
        Домой: {home.name}
        {minutes ? ` · ${minutes} мин` : ''}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  shadow: { textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
});
