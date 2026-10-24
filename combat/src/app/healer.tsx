import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Bar } from '@/components/Bar';
import { Card } from '@/components/Card';
import { Flash } from '@/components/Flash';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { BUILDINGS_BY_ID, deriveCharacter, HEAL_OPTIONS, healAmount, healPrice, secondsToFullHp } from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { formatDuration } from '@/ui/format';
import { UI_ICONS } from '@/ui/icons.generated';
import { colors, radius, spacing } from '@/ui/theme';

/** Лекарь: три зелья на выбор — малое, среднее, большое. Бесплатная альтернатива — подождать регенерацию. */
export default function HealerScreen() {
  const character = useGame((s) => s.character);
  const heal = useGame((s) => s.heal);
  const now = useNow();
  const [flash, show] = useFlash();

  if (!character) return null;

  const derived = deriveCharacter(character);
  const toFull = secondsToFullHp(character, now);
  const healthy = toFull === 0;

  const drink = (fraction: number, flavor: string) => {
    const r = heal(fraction);
    if (!r.ok) {
      Alert.alert('Лекарь', r.reason ?? 'Не получилось');
      return;
    }
    show(flavor);
  };

  return (
    <Screen>
      <BackBar right={<Kredits value={character.kredits} />} />
      <View>
        <Txt variant="title">Лекарь</Txt>
        <Txt variant="muted">{BUILDINGS_BY_ID.healer.description}</Txt>
      </View>

      <Flash text={flash} />

      <Card title="Здоровье">
        <Bar value={character.hp} max={derived.maxHp} />
        <Txt variant="small">{healthy ? 'Ты здоров, лечить нечего.' : `Само заживёт через ${formatDuration(toFull)}.`}</Txt>
      </Card>

      <Card title="Зелья">
        {HEAL_OPTIONS.map((o) => {
          const price = healPrice(character, o.fraction);
          const amount = healAmount(character, o.fraction);
          const poor = character.kredits < price;
          const disabled = healthy || poor;
          return (
            <Pressable
              key={o.id}
              onPress={() => drink(o.fraction, o.flavor)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`${o.name} · ${price} кр.`}
              accessibilityState={{ disabled }}
              style={({ pressed }) => [styles.potion, disabled && styles.potionDisabled, pressed && !disabled && styles.pressed]}>
              <Image source={UI_ICONS[o.icon]} style={styles.potionIcon} resizeMode="contain" />
              <View style={styles.flex}>
                <Txt bold>{o.name}</Txt>
                <Txt variant="small">
                  {healthy ? o.flavor : `+${amount} hp · ${Math.round(o.fraction * 100)}% здоровья`}
                </Txt>
              </View>
              <Txt variant="gold" bold>
                {price} кр.
              </Txt>
            </Pressable>
          );
        })}
        {!healthy && character.kredits < healPrice(character, HEAL_OPTIONS[0].fraction) ? (
          <Txt variant="small" color={colors.red}>
            Не хватает даже на малое. Подожди или сходи в шахту.
          </Txt>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  potion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  potionDisabled: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
  potionIcon: { width: 48, height: 48 },
});
