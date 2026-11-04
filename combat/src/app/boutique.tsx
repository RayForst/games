import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BackBar } from '@/components/BackBar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Flash } from '@/components/Flash';
import { GiIcon } from '@/components/GiIcon';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import {
  canBuyCosmetic,
  COSMETIC_KIND_ICONS,
  COSMETIC_KIND_LABELS,
  COSMETIC_KINDS,
  COSMETICS_BY_ID,
  cosmeticsOf,
  deriveCharacter,
  SEAL_PACKS,
  SEALS_FOR_TOURNAMENT,
  SEALS_FOR_WEEK_STREAK,
  sealsText,
  type CosmeticDef,
  type CosmeticKind,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { playSfx } from '@/ui/sfx';
import { colors, radius, spacing } from '@/ui/theme';

/**
 * Лавка князя: косметика за печати. Примерка — локальное состояние поверх надетого, в сейв не пишется.
 * Ничего отсюда не влияет на бой. Заготовка под монетизацию: платежей нет, печати зарабатываются.
 */
export default function BoutiqueScreen() {
  const character = useGame((s) => s.character);
  const buyCosmetic = useGame((s) => s.buyCosmetic);
  const equipCosmetic = useGame((s) => s.equipCosmetic);
  const unequipCosmetic = useGame((s) => s.unequipCosmetic);
  const buySeals = useGame((s) => s.buySeals);
  const [kind, setKind] = useState<CosmeticKind>('frame');
  const [tryOn, setTryOn] = useState<Partial<Record<CosmeticKind, string>>>({});
  const [flash, show] = useFlash();

  if (!character) return null;

  const derived = deriveCharacter(character);
  const trying = Object.keys(tryOn).length > 0;
  /** Что показываем в примерочной: примерка поверх надетого. */
  const shown = (k: CosmeticKind): CosmeticDef | null => {
    const id = tryOn[k] ?? character.cosmetics.equipped[k];
    return id ? (COSMETICS_BY_ID[id] ?? null) : null;
  };
  const frame = shown('frame');
  const cardBg = shown('cardBg');
  const nameColor = shown('nameColor');
  const title = shown('title');
  const emblem = shown('emblem');

  const onBuy = (def: CosmeticDef) => {
    const r = buyCosmetic(def.id);
    if (!r.ok) {
      show(r.reason ?? 'Не продам');
      return;
    }
    playSfx('coin');
    setTryOn((t) => {
      const next = { ...t };
      delete next[def.kind];
      return next;
    });
    show(`«${def.name}» — твоё. Надето.`);
  };

  const onEquip = (def: CosmeticDef) => {
    const r = equipCosmetic(def.id);
    show(r.ok ? `Надето: «${def.name}».` : (r.reason ?? 'Не получилось'));
    if (r.ok) setTryOn((t) => ({ ...t, [def.kind]: undefined }));
  };

  const onUnequip = (def: CosmeticDef) => {
    const r = unequipCosmetic(def.kind);
    show(r.ok ? `Снято: «${def.name}».` : (r.reason ?? 'Не получилось'));
  };

  const onExchange = (seals: number, kredits: number) => {
    const r = buySeals(seals);
    if (r.ok) playSfx('coin');
    show(r.ok ? `Разменял ${kredits} кр. на ${sealsText(seals)}.` : (r.reason ?? 'Не получилось'));
  };

  return (
    <Screen>
      <BackBar
        right={
          <View style={styles.wallet}>
            <SealsBadge value={character.seals} />
            <Kredits value={character.kredits} size={15} />
          </View>
        }
      />
      <View>
        <Txt variant="title">Лавка князя</Txt>
        <Txt variant="muted">Рамки, прозвища, эмблемы — всё за печати князя. На бой не влияет, на понты — ещё как.</Txt>
      </View>
      <Flash text={flash} />

      <Card title={trying ? 'Примерочная · примерка' : 'Примерочная'} right={trying ? <Button small variant="ghost" title="Сбросить" onPress={() => setTryOn({})} /> : undefined} style={styles.fitting}>
        <View style={styles.previewRow}>
          <View style={styles.previewAvatar}>
            <Avatar seed={character.name} hpRatio={character.hp / derived.maxHp} injured={!!character.injury} frame={frame} cardBg={cardBg} />
          </View>
          <View style={styles.previewInfo}>
            <View style={styles.nameRow}>
              {emblem?.icon ? <GiIcon name={emblem.icon} size={18} color={nameColor?.color ?? colors.gold} /> : null}
              <Txt variant="heading" numberOfLines={1} color={nameColor?.color ?? colors.text} style={styles.flex}>
                {character.name}
              </Txt>
            </View>
            {title ? (
              <Txt variant="small" color={colors.gold}>
                «{title.name}»
              </Txt>
            ) : (
              <Txt variant="small" color={colors.textDim}>
                без прозвища
              </Txt>
            )}
            <Txt variant="small">
              {frame ? `Рамка: ${frame.name.toLowerCase()}` : 'Рамка: обычная'}
              {cardBg ? ` · фон: ${cardBg.name.toLowerCase()}` : ''}
            </Txt>
            <Txt variant="small" color={colors.textDim}>
              Так тебя увидят в чате и на карточке бойца.
            </Txt>
          </View>
        </View>
      </Card>

      <View style={styles.kinds}>
        {COSMETIC_KINDS.map((k) => (
          <Chip key={k} label={COSMETIC_KIND_LABELS[k]} active={k === kind} onPress={() => setKind(k)} />
        ))}
      </View>

      <Card title={COSMETIC_KIND_LABELS[kind]} right={<GiIcon name={COSMETIC_KIND_ICONS[kind]} size={22} />}>
        {cosmeticsOf(kind).map((def) => {
          const owned = character.cosmetics.owned.includes(def.id);
          const equipped = character.cosmetics.equipped[def.kind] === def.id;
          const tryingThis = tryOn[def.kind] === def.id;
          const can = canBuyCosmetic(character, def.id);
          return (
            <View key={def.id} style={[styles.item, equipped && styles.itemEquipped, tryingThis && styles.itemTrying]}>
              <Swatch def={def} />
              <View style={styles.flex}>
                <Txt bold color={equipped ? colors.gold : colors.text}>
                  {def.name}
                  {equipped ? ' · надето' : owned ? ' · твоё' : ''}
                </Txt>
                <Txt variant="small">{def.description}.</Txt>
                <View style={styles.actions}>
                  {owned ? (
                    equipped ? (
                      <Button small variant="ghost" title="Снять" onPress={() => onUnequip(def)} />
                    ) : (
                      <Button small variant="secondary" title="Надеть" onPress={() => onEquip(def)} />
                    )
                  ) : (
                    <>
                      <Button
                        small
                        variant={tryingThis ? 'ghost' : 'secondary'}
                        title={tryingThis ? 'Снять с примерки' : 'Примерить'}
                        onPress={() =>
                          setTryOn((t) => {
                            const next = { ...t };
                            if (tryingThis) delete next[def.kind];
                            else next[def.kind] = def.id;
                            return next;
                          })
                        }
                      />
                      <Button small title={`Купить · ${sealsText(def.price)}`} disabled={!can.ok} onPress={() => onBuy(def)} />
                    </>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      <Card title="Печати князя" right={<SealsBadge value={character.seals} />}>
        <Txt variant="muted">
          Печати дают за достижения, за выигранный турнир ({SEALS_FOR_TOURNAMENT}) и за седьмой день подряд в клубе ({SEALS_FOR_WEEK_STREAK}). Лавочник меняет и на кредиты, но дерёт.
        </Txt>
        <View style={styles.actions}>
          {SEAL_PACKS.map((p) => (
            <Button key={p.seals} small variant="secondary" title={`${sealsText(p.seals)} за ${p.kredits} кр.`} disabled={character.kredits < p.kredits} onPress={() => onExchange(p.seals, p.kredits)} />
          ))}
        </View>
        <Pressable onPress={() => router.push('/stats')} accessibilityRole="button" accessibilityLabel="Достижения">
          <Txt variant="small" color={colors.textDim}>
            Невыданные достижения — в цифрах персонажа, там же забирают печати.
          </Txt>
        </Pressable>
      </Card>
    </Screen>
  );
}

/** Счётчик печатей с сургучной иконкой. */
export function SealsBadge({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <View style={styles.badge} accessibilityLabel={`Печати: ${value}`}>
      <GiIcon name="seal" size={size + 3} color={colors.red} />
      <Txt variant="gold" style={{ fontSize: size, lineHeight: Math.round(size * 1.3) }}>
        {value} печ.
      </Txt>
    </View>
  );
}

/** Образец слева от названия: цветной квадрат, иконка или первая буква прозвища. */
function Swatch({ def }: { def: CosmeticDef }) {
  if (def.kind === 'emblem' && def.icon) {
    return (
      <View style={styles.swatch}>
        <GiIcon name={def.icon} size={28} />
      </View>
    );
  }
  if (def.kind === 'frame') {
    return (
      <View style={[styles.swatch, { borderColor: def.color, borderWidth: def.frameStyle === 'plain' ? 2 : 3 }]}>
        {def.frameStyle !== 'plain' ? <View style={[styles.swatchInner, { borderColor: def.accent ?? def.color }]} /> : null}
      </View>
    );
  }
  if (def.kind === 'nameColor') {
    return (
      <View style={styles.swatch}>
        <Txt variant="heading" color={def.color}>
          Аа
        </Txt>
      </View>
    );
  }
  if (def.kind === 'cardBg') {
    return (
      <View style={[styles.swatch, { backgroundColor: def.color, borderColor: def.accent ?? colors.border }]}>
        <View style={[styles.swatchGlow, { backgroundColor: def.accent ?? colors.cardAlt }]} />
      </View>
    );
  }
  return (
    <View style={styles.swatch}>
      <GiIcon name="laurels" size={28} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fitting: { borderColor: colors.goldDim },
  previewRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  previewAvatar: { width: 128, height: 150 },
  previewInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  itemEquipped: { borderColor: colors.goldDim },
  itemTrying: { borderColor: colors.blue },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  swatchInner: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderWidth: 1, borderRadius: radius.sm },
  swatchGlow: { width: 26, height: 26, borderRadius: 13, opacity: 0.6, marginTop: -18 },
});
