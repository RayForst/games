import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Chip } from '@/components/Chip';
import { Flash } from '@/components/Flash';
import { ItemCard } from '@/components/ItemCard';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { canEquip, dayKey, ITEM_SLOT_LABELS, ITEM_SLOTS, ITEMS, marketPrice, prepareEquip, RESOURCES, type ItemSlot } from '@/game';
import { GiIcon } from '@/components/GiIcon';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

type Filter = 'all' | ItemSlot | 'two-handed';

/** Подписи фильтров: во множественном числе там, где это звучит. */
const FILTER_LABELS: Record<Exclude<Filter, 'all'>, string> = { ...ITEM_SLOT_LABELS, ring: 'Кольца', amulet: 'Амулеты', 'two-handed': 'Двуручное' };
const FILTERS: Exclude<Filter, 'all'>[] = [...ITEM_SLOTS.slice(0, 1), 'two-handed', ...ITEM_SLOTS.slice(1)];

export default function ShopScreen() {
  const character = useGame((s) => s.character);
  const buyItem = useGame((s) => s.buyItem);
  const sellResource = useGame((s) => s.sellResource);
  const [filter, setFilter] = useState<Filter>('all');
  const [flash, show] = useFlash();

  const items = useMemo(() => {
    const list = filter === 'all' ? ITEMS : filter === 'two-handed' ? ITEMS.filter((i) => i.twoHanded) : ITEMS.filter((i) => i.slot === filter);
    return [...list].sort((a, b) => a.level - b.level || a.price - b.price);
  }, [filter]);

  if (!character) return null;

  return (
    <Screen>
      <BackBar />
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title">Магазин</Txt>
          <Txt variant="muted">Продать вещи можно в рюкзаке за полцены.</Txt>
        </View>
        <Kredits value={character.kredits} size={20} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="Все" active={filter === 'all'} onPress={() => setFilter('all')} />
        {FILTERS.map((s) => (
          <Chip key={s} label={FILTER_LABELS[s]} active={filter === s} onPress={() => setFilter(s)} />
        ))}
      </ScrollView>

      <Flash text={flash} />

      <Card title="Скупка" right={<Txt variant="small">цены на сегодня</Txt>}>
        {RESOURCES.map((r) => {
          const have = character.resources[r.id];
          const price = marketPrice(r.id, dayKey());
          return (
            <View key={r.id} style={styles.resourceRow}>
              <GiIcon name={r.icon} size={22} color={colors.textMuted} />
              <View style={styles.flex}>
                <Txt bold>{r.name}</Txt>
                <Txt variant="small">
                  {price} кр./шт. · у тебя {have}
                </Txt>
              </View>
              <Button
                small
                variant="secondary"
                title={have > 0 ? `Продать · ${have * price} кр.` : 'Пусто'}
                disabled={have === 0}
                onPress={() => {
                  const res = sellResource(r.id);
                  show(res.ok ? `+${res.kredits} кр. за ${r.name.toLowerCase()}` : (res.reason ?? 'Не получилось'));
                }}
              />
            </View>
          );
        })}
      </Card>

      {items.map((item) => {
        const check = canEquip(prepareEquip(character, item).character, item);
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
  resourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
