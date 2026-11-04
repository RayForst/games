import { StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Flash } from '@/components/Flash';
import { ItemIcon } from '@/components/ItemIcon';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import {
  BUILDINGS_BY_ID,
  canUpgrade,
  getItem,
  isEquipped,
  itemDisplayName,
  maxDurability,
  repairCost,
  upgradeCost,
  UPGRADE_MAX,
  oreForUpgrade,
  woodForRepair,
  bonesForRepair,
  townOf,
  townPrice,
  townSmithyMult,
  type InventoryItem,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { colors, radius, spacing } from '@/ui/theme';

/** Кузница: ремонт изношенного и заточка оружия и брони. */
export default function SmithyScreen() {
  const character = useGame((s) => s.character);
  const repairItem = useGame((s) => s.repairItem);
  const repairAll = useGame((s) => s.repairAll);
  const upgradeItem = useGame((s) => s.upgradeItem);
  const [flash, show] = useFlash();

  if (!character) return null;

  const items = [...character.backpack].sort((a, b) => Number(isEquipped(character, b.uid)) - Number(isEquipped(character, a.uid)));
  // Особенность города: в Рудне кузница берёт на 20 % меньше.
  const town = townOf(character.location);
  const mult = townSmithyMult(character.location);
  const totalRepair = townPrice(items.reduce((sum, i) => sum + repairCost(getItem(i.itemId), i.durability), 0), mult);

  const onRepairAll = (pay: 'kredits' | 'wood' | 'bones' = 'kredits') => {
    const r = repairAll(pay);
    show(r.ok ? (pay === 'wood' ? 'Починил всё за дрова. Макар доволен.' : pay === 'bones' ? 'Починил всё за кости. Кузнец сварил клей и не спросил, чьи.' : `Починил всё за ${r.kredits} кр.`) : (r.reason ?? 'Не получилось'));
  };
  const woodNeeded = totalRepair > 0 ? woodForRepair(totalRepair) : 0;
  const bonesNeeded = totalRepair > 0 ? bonesForRepair(totalRepair) : 0;

  const onRepair = (inv: InventoryItem) => {
    const r = repairItem(inv.uid);
    show(r.ok ? `${getItem(inv.itemId).name}: как новая.` : (r.reason ?? 'Не получилось'));
  };

  // Цена написана на кнопке, подтверждение не нужно.
  const onUpgrade = (inv: InventoryItem, pay: 'kredits' | 'ore' = 'kredits') => {
    const item = getItem(inv.itemId);
    const r = upgradeItem(inv.uid, pay);
    show(r.ok ? `${item.name} теперь +${inv.upgrade + 1}.` : (r.reason ?? 'Не получилось'));
  };

  return (
    <Screen>
      <BackBar title={town && town.id !== 'city' ? town.name : undefined} right={<Kredits value={character.kredits} />} />
      <View>
        <Txt variant="title">Кузница</Txt>
        <Txt variant="muted">{town && town.id !== 'city' ? `Кузница ${town.locative}. ${mult < 1 ? `${town.perk.name}: ${town.perk.description}` : 'Молот тот же, цены как у Макара.'}` : BUILDINGS_BY_ID.smithy.description}</Txt>
      </View>

      <Flash text={flash} />

      <Card title="Ремонт" right={totalRepair > 0 ? <Txt variant="gold">{totalRepair} кр.</Txt> : <Txt variant="small">всё цело</Txt>}>
        <Txt variant="small">Каждый бой снимает единицу прочности со всего надетого. Сломанная вещь висит мёртвым грузом.</Txt>
        <Button title={totalRepair > 0 ? `Починить всё · ${totalRepair} кр.` : 'Чинить нечего'} onPress={() => onRepairAll('kredits')} disabled={totalRepair === 0 || character.kredits < totalRepair} />
        {totalRepair > 0 ? (
          <Button
            small
            variant="secondary"
            title={`Или за дрова · ${woodNeeded} шт. (есть ${character.resources.wood})`}
            onPress={() => onRepairAll('wood')}
            disabled={character.resources.wood < woodNeeded}
          />
        ) : null}
        {totalRepair > 0 && character.resources.bones > 0 ? (
          <Button
            small
            variant="ghost"
            title={`Или за кости · ${bonesNeeded} шт. (есть ${character.resources.bones})`}
            onPress={() => onRepairAll('bones')}
            disabled={character.resources.bones < bonesNeeded}
          />
        ) : null}
      </Card>

      <Txt variant="heading">Твои вещи</Txt>
      {items.length === 0 ? (
        <Card>
          <Txt variant="muted" center>
            Нечего ни чинить, ни точить. Загляни в магазин.
          </Txt>
        </Card>
      ) : null}
      {items.map((inv) => {
        const item = getItem(inv.itemId);
        const max = maxDurability(item);
        const broken = inv.durability <= 0;
        const repair = townPrice(repairCost(item, inv.durability), mult);
        const sharpenable = canUpgrade(item);
        const maxed = inv.upgrade >= UPGRADE_MAX;
        const nextCost = sharpenable && !maxed ? townPrice(upgradeCost(item, inv.upgrade + 1), mult) : 0;
        return (
          <View key={inv.uid} style={[styles.row, broken && styles.rowBroken]}>
            <ItemIcon id={item.id} slot={item.slot} size={52} />
            <View style={styles.flex}>
              <View style={styles.titleRow}>
                <Txt bold numberOfLines={1} style={styles.flex}>
                  {itemDisplayName(item, inv.upgrade)}
                </Txt>
                {isEquipped(character, inv.uid) ? <Txt variant="small">надето</Txt> : null}
              </View>
              <Bar
                value={inv.durability}
                max={max}
                height={6}
                color={broken ? colors.red : inv.durability < max * 0.3 ? colors.gold : colors.green}
                label={broken ? 'Сломано' : 'Прочность'}
              />
              <View style={styles.actions}>
                <Button
                  small
                  variant="secondary"
                  title={repair > 0 ? `Починить · ${repair} кр.` : 'Цела'}
                  disabled={repair === 0 || character.kredits < repair}
                  onPress={() => onRepair(inv)}
                />
                <Button
                  small
                  title={!sharpenable ? 'Не точится' : maxed ? `Макс +${UPGRADE_MAX}` : `Точить +${inv.upgrade + 1} · ${nextCost} кр.`}
                  disabled={!sharpenable || maxed || broken || character.kredits < nextCost}
                  onPress={() => onUpgrade(inv)}
                />
                {sharpenable && !maxed && !broken ? (
                  <Button
                    small
                    variant="ghost"
                    title={`или ${oreForUpgrade(nextCost)} руды`}
                    disabled={character.resources.ore < oreForUpgrade(nextCost)}
                    onPress={() => onUpgrade(inv, 'ore')}
                  />
                ) : null}
              </View>
            </View>
          </View>
        );
      })}
      <Txt variant="small" center color={colors.textDim}>
        Заточка: оружию +1 к урону, броне +1 к защите за уровень. До +{UPGRADE_MAX}. Руды в сумке: {character.resources.ore}, дров: {character.resources.wood}, костей: {character.resources.bones}.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rowBroken: { borderColor: colors.redDim },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
});
