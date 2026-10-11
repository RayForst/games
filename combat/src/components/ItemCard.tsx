import { StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Txt } from './Txt';
import { colors, radius, spacing } from '@/ui/theme';
import { bonusText, requirementsText, SLOT_LABELS, type ItemDef } from '@/game';

interface Action {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
}

interface Props {
  item: ItemDef;
  price?: number;
  priceLabel?: string;
  badge?: string;
  warning?: string | null;
  actions?: Action[];
}

export function ItemCard({ item, price, priceLabel, badge, warning, actions = [] }: Props) {
  const req = requirementsText(item);
  const bonus = bonusText(item);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.titleCol}>
          <Txt bold>{item.name}</Txt>
          <Txt variant="small">{SLOT_LABELS[item.slot]}</Txt>
        </View>
        {badge ? (
          <View style={styles.badge}>
            <Txt variant="small" color={colors.black} bold>
              {badge}
            </Txt>
          </View>
        ) : null}
        {price !== undefined ? (
          <View style={styles.priceCol}>
            <Txt variant="gold">{price} кр.</Txt>
            {priceLabel ? <Txt variant="small">{priceLabel}</Txt> : null}
          </View>
        ) : null}
      </View>
      {bonus ? <Txt variant="muted">{bonus}</Txt> : null}
      {req ? <Txt variant="small">Требуется: {req}</Txt> : null}
      {item.description ? (
        <Txt variant="small" style={styles.description}>
          {item.description}
        </Txt>
      ) : null}
      {warning ? (
        <Txt variant="small" color={colors.red}>
          {warning}
        </Txt>
      ) : null}
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Button key={a.title} small title={a.title} onPress={a.onPress} variant={a.variant} disabled={a.disabled} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  titleCol: { flex: 1 },
  priceCol: { alignItems: 'flex-end' },
  badge: {
    backgroundColor: colors.green,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  description: { fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});
