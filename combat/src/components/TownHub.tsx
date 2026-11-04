import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { DefenseCard } from './DefenseCard';
import { Flash } from './Flash';
import { GiIcon } from './GiIcon';
import { HomeLink } from './HomeLink';
import { Kredits } from './Kredits';
import { Screen } from './Screen';
import { SideBadge } from './SideBadge';
import { Txt } from './Txt';
import {
  dayKey,
  LOCATIONS_BY_ID,
  MARKET_MULT,
  marketPrice,
  neighbours,
  RACES_BY_ID,
  RESOURCES,
  routeBetween,
  SIDES_BY_ID,
  TOWNS_BY_ID,
  unreadCount,
  type TownId,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

/**
 * Хаб любого города, кроме Города (у того карта-картинка): арена, работа, рынок, лавка, лекарь, кузница,
 * особенность города и дороги. Всё по данным `TOWNS`; Брод — тот же экран с данными Брода.
 */
export function TownHub({ town }: { town: TownId }) {
  const character = useGame((s) => s.character);
  const mining = useGame((s) => s.mining);
  const roadNews = useGame((s) => s.roadNews);
  const dismissRoadNews = useGame((s) => s.dismissRoadNews);
  const sellResource = useGame((s) => s.sellResource);
  const startTravel = useGame((s) => s.startTravel);
  const unread = useGame((s) => unreadCount(s.chat, s.chatSeenAt));
  const guild = useGame((s) => s.guild);
  const [flash, show] = useFlash(2500);

  if (!character) return null;

  const def = TOWNS_BY_ID[town];
  const location = LOCATIONS_BY_ID[town];
  const haveAny = RESOURCES.some((r) => character.resources[r.id] > 0);
  const marketMult = MARKET_MULT[town];
  const isHome = character.home === town;
  const foreign = def.side !== character.side;

  const go = (to: typeof location.id) => {
    const r = startTravel(to);
    if (!r.ok) show(r.reason ?? 'Не получилось');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Txt variant="title">{def.name}</Txt>
            <SideBadge side={def.side} />
          </View>
          <Txt variant="small" color={colors.textMuted}>
            {def.race ? `Столица ${RACES_BY_ID[def.race].genitive}, ${SIDES_BY_ID[def.side].name}` : `Главная столица: ${SIDES_BY_ID[def.side].name}`}
            {isHome ? ' · твой дом' : foreign ? ' · чужая сторона' : ''}
          </Txt>
          <Txt variant="muted">{location.description}</Txt>
        </View>
        <Kredits value={character.kredits} />
      </View>
      <View style={styles.links}>
        <Pressable onPress={() => router.push('/world')} accessibilityRole="button" accessibilityLabel="Карта мира" style={styles.mapLink}>
          <GiIcon name="road" size={18} />
          <Txt variant="gold">Карта мира</Txt>
        </Pressable>
        <Pressable onPress={() => router.push('/chat')} accessibilityRole="button" accessibilityLabel="Чат" style={styles.mapLink}>
          <GiIcon name="chat" size={18} />
          <Txt variant="gold">Чат{unread > 0 ? ` · ${unread}` : ''}</Txt>
        </Pressable>
        <Pressable onPress={() => router.push('/guild')} accessibilityRole="button" accessibilityLabel="Гильдии" style={styles.mapLink}>
          <GiIcon name="guild" size={18} />
          <Txt variant="gold">{guild ? `[${guild.tag}]` : 'Гильдии'}</Txt>
        </Pressable>
        <HomeLink onError={show} />
      </View>

      {roadNews ? (
        <Pressable onPress={dismissRoadNews} accessibilityRole="button" accessibilityLabel="Дорожные вести">
          <Card style={styles.news}>
            <View style={styles.row}>
              <GiIcon name="event" size={22} />
              <Txt style={styles.flex}>{roadNews}</Txt>
            </View>
          </Card>
        </Pressable>
      ) : null}

      <Flash text={flash} />

      <DefenseCard town={town} onError={show} />

      <Card title={def.perk.name} right={<GiIcon name="crown" size={20} color={colors.goldDim} />}>
        <Txt variant="muted">{def.perk.description}</Txt>
      </Card>

      <Card title={def.arenaName} right={<Txt variant="small">{def.arenaLevelBonus > 0 ? `соперники +${def.arenaLevelBonus} ур.` : `соперники под ${character.level} ур.`}</Txt>}>
        <Txt variant="muted">{def.arenaHint}</Txt>
        <Button title="В зал" onPress={() => router.push('/arena')} disabled={!!mining} />
      </Card>

      <Card title={def.jobName} right={<GiIcon name={def.job === 'caravan' ? 'caravan' : 'ore'} size={22} />}>
        <Txt variant="muted">{def.jobHint}</Txt>
        <Button
          title={mining && (mining.job ?? 'mine') === def.job ? `Проверить: ${def.jobName.toLowerCase()}` : def.job === 'caravan' ? 'К купцам' : 'К штольне'}
          onPress={() => router.push(def.job === 'caravan' ? '/caravan' : '/mine')}
          variant={mining ? 'primary' : 'secondary'}
        />
      </Card>

      <Card title="Лавка, лекарь, кузница">
        <View style={styles.row}>
          <Button small variant="secondary" title="Лавка" onPress={() => router.push('/shop')} />
          <Button small variant="secondary" title="Лекарь" onPress={() => router.push('/healer')} />
          <Button small variant="secondary" title="Кузница" onPress={() => router.push('/smithy')} />
        </View>
        <Txt variant="small">
          {def.perk.smithyMult ? `Кузница здесь берёт ×${def.perk.smithyMult}.` : def.perk.healerMult ? `Лекарь здесь берёт ×${def.perk.healerMult}.` : def.perk.injuryBogwort ? `Травму снимают за ${def.perk.injuryBogwort} болотника.` : 'Цены как в Городе.'}
        </Txt>
      </Card>

      <Card title={`Рынок: ${def.name}`} right={<Txt variant="small">цены ×{marketMult}</Txt>}>
        {RESOURCES.filter((r) => character.resources[r.id] > 0).map((r) => {
          const have = character.resources[r.id];
          const price = marketPrice(r.id, dayKey(), town);
          return (
            <View key={r.id} style={styles.row}>
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
                title={`Продать · ${have * price} кр.`}
                onPress={() => {
                  const res = sellResource(r.id);
                  show(res.ok ? `+${res.kredits} кр. за ${r.name.toLowerCase()}` : (res.reason ?? 'Не получилось'));
                }}
              />
            </View>
          );
        })}
        {!haveAny ? (
          <Txt variant="small">
            Сумка пуста. {marketMult > 1 ? `Здесь за ресурсы платят на ${Math.round((marketMult - 1) * 100)} % больше, чем в Городе.` : 'Скупают всё: травы, дрова, шкуры, руду, реликвии, кости.'}
          </Txt>
        ) : null}
      </Card>

      <Card title="Дороги">
        <View style={styles.roads}>
          {neighbours(town).map((n) => {
            const r = routeBetween(town, n);
            return <Button key={n} small variant="secondary" title={`${LOCATIONS_BY_ID[n].name} · ${r?.minutes ?? '?'} мин`} onPress={() => go(n)} disabled={!!mining} />;
          })}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingTop: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  links: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  news: { borderColor: colors.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  roads: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
