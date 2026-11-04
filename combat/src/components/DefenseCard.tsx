import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { GiIcon } from './GiIcon';
import { Txt } from './Txt';
import { SIDES_BY_ID, TOWNS_BY_ID, type TownId } from '@/game';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

/** Ответный рейд чужих застал тебя дома: налётчик у ворот, можно отбиться или оставить страже. */
export function DefenseCard({ town, onError }: { town: TownId; onError?: (reason: string) => void }) {
  const defense = useGame((s) => s.raids.defense);
  const startDefense = useGame((s) => s.startDefense);
  const dismissDefense = useGame((s) => s.dismissDefense);
  if (!defense || defense.town !== town) return null;
  const o = defense.opponent;
  return (
    <Card title="Налёт на ворота" right={<GiIcon name="flame" size={22} color={colors.red} />} style={styles.card}>
      <Txt>
        {SIDES_BY_ID[defense.side].name} ворвалась в {TOWNS_BY_ID[town].name} через склеп. У ворот — <Txt bold>{o.name}</Txt>, {o.level} ур.
      </Txt>
      <Txt variant="small">{o.flavor}</Txt>
      <View style={styles.row}>
        <Button
          title="Отбиться"
          onPress={() => {
            const r = startDefense();
            if (!r.ok) onError?.(r.reason ?? 'Не получилось');
            else router.push('/fight');
          }}
        />
        <Button title="Пусть стража" variant="secondary" onPress={dismissDefense} />
      </View>
      <Txt variant="small">Один бой. Отобьёшься — добыча с налётчика и очки войны своим.</Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderColor: colors.red },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
