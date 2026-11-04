import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from './Button';
import { Card } from './Card';
import { Flash } from './Flash';
import { GiIcon } from './GiIcon';
import { Kredits } from './Kredits';
import { Screen } from './Screen';
import { Txt } from './Txt';
import { dayKey, LOCATIONS_BY_ID, MARKET_MULT, marketPrice, RESOURCES, routeBetween, unreadCount } from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

/** Брод — вольный город за перевалом: арена посильнее, рынок пощедрее, караваны. */
export function BrodHub() {
  const character = useGame((s) => s.character);
  const mining = useGame((s) => s.mining);
  const roadNews = useGame((s) => s.roadNews);
  const dismissRoadNews = useGame((s) => s.dismissRoadNews);
  const sellResource = useGame((s) => s.sellResource);
  const startTravel = useGame((s) => s.startTravel);
  const unread = useGame((s) => unreadCount(s.chat, s.chatSeenAt));
  const guild = useGame((s) => s.guild);
  const [flash, show] = useFlash();

  if (!character) return null;

  const back = routeBetween('brod', 'pass');
  const goBack = () => {
    const r = startTravel('pass');
    if (!r.ok) Alert.alert('Дорога', r.reason ?? 'Не получилось');
  };
  const haveAny = RESOURCES.some((r) => character.resources[r.id] > 0);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title">Брод</Txt>
          <Txt variant="muted">{LOCATIONS_BY_ID.brod.description}</Txt>
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

      <Card title="Арена Брода" right={<Txt variant="small">соперники на уровень выше</Txt>}>
        <Txt variant="muted">Здесь дерутся не за уважение, а за деньги: плата на треть больше, опыта на пятую часть. Знакомых лиц нет.</Txt>
        <Button title="В зал" onPress={() => router.push('/arena')} disabled={!!mining} />
      </Card>

      <Card title="Караван" right={<GiIcon name="caravan" size={22} />}>
        <Txt variant="muted">Охрана обоза через перевал. Платят втрое против шахты, но тракт любят разбойники.</Txt>
        <Button title={mining?.job === 'caravan' ? 'Проверить караван' : 'К купцам'} onPress={() => router.push('/caravan')} variant={mining?.job === 'caravan' ? 'primary' : 'secondary'} />
      </Card>

      <Card title="Рынок Брода" right={<Txt variant="small">цены ×{MARKET_MULT.brod}</Txt>}>
        {RESOURCES.filter((r) => character.resources[r.id] > 0).map((r) => {
          const have = character.resources[r.id];
          const price = marketPrice(r.id, dayKey(), 'brod');
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
        {!haveAny ? <Txt variant="small">Сумка пуста. Здесь за травы, дрова, шкуры, руду и реликвии платят на 40 % больше, чем дома.</Txt> : null}
      </Card>

      <Button title={back ? `К перевалу · ${back.minutes} мин` : 'К перевалу'} variant="secondary" onPress={goBack} disabled={!!mining} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingTop: spacing.sm },
  links: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  news: { borderColor: colors.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
