import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Flash } from '@/components/Flash';
import { ItemCard } from '@/components/ItemCard';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { canEquip, ITEMS, SLOT_LABELS, SLOTS, type Slot } from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { spacing } from '@/ui/theme';

type Filter = 'all' | Slot;

export default function ShopScreen() {
  const character = useGame((s) => s.character);
  const buyItem = useGame((s) => s.buyItem);
  const [filter, setFilter] = useState<Filter>('all');
  const [flash, show] = useFlash();

  const items = useMemo(() => {
    const list = filter === 'all' ? ITEMS : ITEMS.filter((i) => i.slot === filter);
    return [...list].sort((a, b) => a.level - b.level || a.price - b.price);
  }, [filter]);

  if (!character) return null;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title">Магазин</Txt>
          <Txt variant="muted">Продать вещи можно в рюкзаке за полцены.</Txt>
        </View>
        <Txt variant="gold" style={styles.kredits}>
          {character.kredits} кр.
        </Txt>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Все" active={filter === 'all'} onPress={() => setFilter('all')} />
        {SLOTS.map((s) => (
          <Chip key={s} label={SLOT_LABELS[s]} active={filter === s} onPress={() => setFilter(s)} />
        ))}
      </ScrollView>

      <Flash text={flash} />

      {items.map((item) => {
        const check = canEquip(character, item);
        const affordable = character.kredits >= item.price;
        return (
          <ItemCard
            key={item.id}
            item={item}
            price={item.price}
            warning={!check.ok ? `Пока не наденешь: ${check.reason?.toLowerCase()}` : null}
            actions={[
              {
                title: affordable ? 'Купить' : 'Не хватает кредитов',
                disabled: !affordable,
                onPress: () => {
                  const r = buyItem(item.id);
                  show(r.ok ? `${item.name} — в рюкзаке` : (r.reason ?? 'Не получилось'));
                },
              },
            ]}
          />
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, paddingTop: spacing.sm },
  kredits: { fontSize: 20 },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
});
