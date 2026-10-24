import { Alert, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Flash } from '@/components/Flash';
import { ItemCard } from '@/components/ItemCard';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { canEquip, getItem, isEquipped, sellPrice, SLOTS } from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { spacing } from '@/ui/theme';

export default function BackpackScreen() {
  const character = useGame((s) => s.character);
  const equip = useGame((s) => s.equip);
  const unequip = useGame((s) => s.unequip);
  const sellItem = useGame((s) => s.sellItem);
  const [flash, show] = useFlash();

  if (!character) return null;

  const equipped = SLOTS.map((slot) => {
    const uid = character.equipment[slot];
    const inv = uid ? character.backpack.find((i) => i.uid === uid) : null;
    return inv ? { slot, inv, item: getItem(inv.itemId) } : null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const loose = character.backpack.filter((i) => !isEquipped(character, i.uid)).map((inv) => ({ inv, item: getItem(inv.itemId) }));

  const onSell = (uid: string, name: string, price: number) => {
    Alert.alert('Продать', `${name} за ${price} кр.?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Продать',
        style: 'destructive',
        onPress: () => {
          const r = sellItem(uid);
          show(r.ok ? `+${price} кр.` : (r.reason ?? 'Не получилось'));
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title">Рюкзак</Txt>
          <Txt variant="muted">
            Вещей: {character.backpack.length} · надето: {equipped.length}
          </Txt>
        </View>
        <Kredits value={character.kredits} size={20} />
      </View>

      <Flash text={flash} />

      <Txt variant="heading">Надето</Txt>
      {equipped.length === 0 ? (
        <Card>
          <Txt variant="muted" center>
            Дерёшься голыми руками.
          </Txt>
        </Card>
      ) : null}
      {equipped.map(({ slot, inv, item }) => (
        <ItemCard
          key={inv.uid}
          item={item}
          badge="Надето"
          actions={[{ title: 'Снять', variant: 'secondary', onPress: () => unequip(slot) }]}
        />
      ))}

      <Txt variant="heading" style={styles.sectionTitle}>
        В рюкзаке
      </Txt>
      {loose.length === 0 ? (
        <Card>
          <Txt variant="muted" center>
            Пусто. Загляни в магазин.
          </Txt>
        </Card>
      ) : null}
      {loose.map(({ inv, item }) => {
        const check = canEquip({ ...character, equipment: { ...character.equipment, [item.slot]: null } }, item);
        const price = sellPrice(item);
        return (
          <ItemCard
            key={inv.uid}
            item={item}
            warning={check.ok ? null : check.reason}
            actions={[
              {
                title: 'Надеть',
                disabled: !check.ok,
                onPress: () => {
                  const r = equip(inv.uid);
                  show(r.ok ? `${item.name} — надето` : (r.reason ?? 'Не получилось'));
                },
              },
              { title: `Продать · ${price} кр.`, variant: 'secondary', onPress: () => onSell(inv.uid, item.name, price) },
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
  sectionTitle: { marginTop: spacing.sm },
});
