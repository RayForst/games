import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Flash } from '@/components/Flash';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { activeInjury, BUILDINGS_BY_ID, cureCost, deriveCharacter, HEAL_OPTIONS, healAmount, healPrice, INJURY_BOGWORT, injurySecondsLeft, injuryText, POTION_HERBS, secondsToFullHp } from '@/game';
import { GiIcon } from '@/components/GiIcon';
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
  const cureInjury = useGame((s) => s.cureInjury);
  const now = useNow();
  const [flash, show] = useFlash();

  if (!character) return null;

  const derived = deriveCharacter(character);
  const toFull = secondsToFullHp(character, now);
  const healthy = toFull === 0;
  const injury = activeInjury(character, now);
  const cure = injury ? cureCost(character, injury) : 0;

  const onCure = (pay: 'kredits' | 'bogwort' = 'kredits') => {
    const r = cureInjury(pay);
    if (!r.ok) {
      Alert.alert('Лекарь', r.reason ?? 'Не получилось');
      return;
    }
    show('Вправил. Больше не ноет.');
  };

  const drink = (fraction: number, flavor: string, pay: 'kredits' | 'herbs' = 'kredits') => {
    const r = heal(fraction, pay);
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

      {injury ? (
        <Card title="Травма" right={<Txt variant="small">ещё {formatDuration(injurySecondsLeft(injury, now))}</Txt>}>
          <Txt color={colors.red}>{injuryText(injury)}</Txt>
          <Txt variant="small">Пройдёт сама, но драться с ней хуже. Лекарь вправит сразу.</Txt>
          <Button title={`Вылечить травму · ${cure} кр.`} onPress={() => onCure('kredits')} disabled={character.kredits < cure} />
          <Button
            small
            variant="ghost"
            title={`Или за ${INJURY_BOGWORT} болотника (есть ${character.resources.bogwort})`}
            onPress={() => onCure('bogwort')}
            disabled={character.resources.bogwort < INJURY_BOGWORT}
          />
        </Card>
      ) : null}

      <Card title="Зелья">
        {HEAL_OPTIONS.map((o) => {
          const price = healPrice(character, o.fraction);
          const amount = healAmount(character, o.fraction);
          const poor = character.kredits < price;
          const noHerbs = character.resources.herbs < POTION_HERBS[o.id];
          return (
            <View key={o.id} style={[styles.potion, healthy && styles.potionDisabled]}>
              <Image source={UI_ICONS[o.icon]} style={styles.potionIcon} resizeMode="contain" />
              <View style={styles.flex}>
                <Txt bold>{o.name}</Txt>
                <Txt variant="small">
                  {healthy ? o.flavor : `+${amount} hp · ${Math.round(o.fraction * 100)}% здоровья`}
                </Txt>
              </View>
              <View style={styles.priceCol}>
                <Pressable
                  onPress={() => drink(o.fraction, o.flavor)}
                  disabled={healthy || poor}
                  accessibilityRole="button"
                  accessibilityLabel={`${o.name} · ${price} кр.`}
                  accessibilityState={{ disabled: healthy || poor }}
                  style={({ pressed }) => [styles.payBtn, (healthy || poor) && styles.potionDisabled, pressed && styles.pressed]}>
                  <Txt variant="gold" bold>
                    {price} кр.
                  </Txt>
                </Pressable>
                <Pressable
                  onPress={() => drink(o.fraction, o.flavor, 'herbs')}
                  disabled={healthy || noHerbs}
                  accessibilityRole="button"
                  accessibilityLabel={`${o.name} за травы`}
                  accessibilityState={{ disabled: healthy || noHerbs }}
                  style={({ pressed }) => [styles.herbs, (healthy || noHerbs) && styles.potionDisabled, pressed && styles.pressed]}>
                  <GiIcon name="herbs" size={14} color={colors.green} />
                  <Txt variant="small" color={colors.green}>
                    или {POTION_HERBS[o.id]} трав
                  </Txt>
                </Pressable>
              </View>
            </View>
          );
        })}
        <Txt variant="small">
          Трав в сумке: {character.resources.herbs}. Лекарь варит из них сам, деньги не берёт.
        </Txt>
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
  priceCol: { alignItems: 'flex-end', gap: 4 },
  payBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.goldDim },
  herbs: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
