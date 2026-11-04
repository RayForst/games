import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Bar } from './Bar';
import { Button } from './Button';
import { Card } from './Card';
import { Flash } from './Flash';
import { GiIcon } from './GiIcon';
import { HomeLink } from './HomeLink';
import { Kredits } from './Kredits';
import { Screen } from './Screen';
import { Txt } from './Txt';
import {
  canStartRaid,
  CRYPT,
  cryptCleared,
  cryptLevel,
  dayKey,
  deriveCharacter,
  LOCATIONS_BY_ID,
  normalizeCrypt,
  RAID_FIGHTS,
  RAID_WAR_POINTS,
  raidTarget,
  routeBetween,
  SIDES_BY_ID,
  TOWNS_BY_ID,
  unreadCount,
  otherSide,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { colors, radius, spacing } from '@/ui/theme';

/** Склеп: пять ярусов нежити за день, кости в мешок, а с нижнего хода — рейд на чужую столицу. */
export function CryptHub() {
  const character = useGame((s) => s.character);
  const cryptRaw = useGame((s) => s.crypt);
  const raid = useGame((s) => s.raid);
  const raids = useGame((s) => s.raids);
  const mining = useGame((s) => s.mining);
  const roadNews = useGame((s) => s.roadNews);
  const dismissRoadNews = useGame((s) => s.dismissRoadNews);
  const startCryptFight = useGame((s) => s.startCryptFight);
  const startRaid = useGame((s) => s.startRaid);
  const startRaidFight = useGame((s) => s.startRaidFight);
  const abandonRaid = useGame((s) => s.abandonRaid);
  const startTravel = useGame((s) => s.startTravel);
  const unread = useGame((s) => unreadCount(s.chat, s.chatSeenAt));
  const now = useNow();
  const [flash, show] = useFlash(3000);
  // Двухшаговое подтверждение кнопками: Alert на вебе не годится.
  const [confirm, setConfirm] = useState<'raid' | 'leave' | null>(null);

  if (!character) return null;

  const day = dayKey(now);
  const crypt = normalizeCrypt(cryptRaw, day);
  const cleared = cryptCleared(crypt);
  const derived = deriveCharacter(character, now);
  const location = LOCATIONS_BY_ID.crypt;
  const target = raidTarget(character.side);
  const enemy = SIDES_BY_ID[otherSide(character.side)];
  const raidToday = raid && raid.day === day ? raid : null;
  const raidActive = raidToday?.status === 'active';
  const canRaid = canStartRaid({ cleared, log: raids, day, raid, hp: character.hp });

  const descend = () => {
    const r = startCryptFight();
    if (!r.ok) {
      show(r.reason ?? 'Не получилось');
      return;
    }
    router.push('/fight');
  };

  const onRaid = () => {
    setConfirm(null);
    const r = startRaid();
    if (!r.ok) {
      show(r.reason ?? 'Не получилось');
      return;
    }
    router.push('/fight');
  };

  const onNext = () => {
    const r = startRaidFight();
    if (!r.ok) {
      show(r.reason ?? 'Не получилось');
      return;
    }
    router.push('/fight');
  };

  const onLeave = () => {
    setConfirm(null);
    const r = abandonRaid();
    show(r.ok ? 'Ушёл под землю. Рейд окончен.' : (r.reason ?? 'Не получилось'));
  };

  const go = (to: 'city' | 'brod') => {
    const r = startTravel(to);
    if (!r.ok) show(r.reason ?? 'Не получилось');
  };

  const next = crypt.floor + 1;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant="title">Склеп</Txt>
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

      <Card>
        <Bar value={character.hp} max={derived.maxHp} label={`${character.name}, ${character.level} ур.`} />
        <Txt variant="small">Под землёй не лечат: здоровье тянется как обычно, по часам. Костей в мешке: {character.resources.bones}.</Txt>
      </Card>

      {raidActive && raidToday ? (
        <Card title={`Рейд: ${TOWNS_BY_ID[raidToday.target].name}`} right={<GiIcon name="flame" size={22} color={colors.red} />} style={styles.raid}>
          <Txt>
            Бой {Math.min(raidToday.stage + 1, RAID_FIGHTS)} из {RAID_FIGHTS}. Уложил: {raidToday.kills}. Добыча: {raidToday.loot} кр.
          </Txt>
          <Txt variant="small">Ты наверху, {TOWNS_BY_ID[raidToday.target].locative}. Между боями не лечат; проиграл — вынесут обратно в склеп.</Txt>
          <Button title="Следующий бой" onPress={onNext} />
          {confirm === 'leave' ? (
            <View style={styles.row}>
              <Button small title="Да, уйти" variant="secondary" onPress={onLeave} />
              <Button small title="Остаюсь" variant="ghost" onPress={() => setConfirm(null)} />
            </View>
          ) : (
            <Button small variant="ghost" title="Уйти под землю (рейд окончен)" onPress={() => setConfirm('leave')} />
          )}
        </Card>
      ) : null}

      <Card title="Ярусы" right={<Txt variant="small">{cleared ? 'пройден до дна' : `пройдено ${crypt.floor} из ${CRYPT.length}`}</Txt>}>
        {CRYPT.map((f) => {
          const done = f.floor <= crypt.floor;
          const isNext = f.floor === next;
          return (
            <View key={f.floor} style={[styles.floor, isNext && styles.floorNext, done && styles.floorDone]}>
              <GiIcon name="skull" size={26} color={done ? colors.green : isNext ? colors.gold : colors.textDim} />
              <View style={styles.flex}>
                <Txt bold color={done ? colors.green : isNext ? colors.gold : colors.textDim}>
                  {f.floor}. {f.name} · враги ~{cryptLevel(f.floor, character.level)} ур. · кости {f.bones[0]}–{f.bones[1]}
                </Txt>
                <Txt variant="small" color={done || isNext ? colors.textMuted : colors.textDim}>
                  {f.flavor} {f.foes.map((x) => x.name).join(', ')}.
                </Txt>
              </View>
            </View>
          );
        })}
        {!cleared ? (
          <Button title={`Спуститься: ярус ${next}`} onPress={descend} disabled={!!mining || raidActive} />
        ) : (
          <Txt variant="small" center>
            Внизу тихо. Завтра всё засыплет обратно и спуск начнётся заново.
          </Txt>
        )}
      </Card>

      <Card title={`Нижний ход: ${TOWNS_BY_ID[target].name}`} right={<GiIcon name="town" size={22} color={cleared ? colors.gold : colors.textDim} />}>
        <Txt variant="muted">
          Ход выводит в столицу {enemy.name === 'Корона' ? 'Короны' : 'Вольницы'}. Наверху — {RAID_FIGHTS} боя подряд против её бойцов, без лекаря между ними. За каждую победу
          добыча, {RAID_WAR_POINTS} очков войны {SIDES_BY_ID[character.side].dative} и слава гильдии; трое легли — титул «Налётчик». Раз в день.
        </Txt>
        {raidActive ? null : raidToday ? (
          <Txt variant="small" color={raidToday.status === 'won' ? colors.green : colors.textMuted}>
            Сегодня: {raidToday.status === 'won' ? 'полный рейд' : 'тебя вынесли'}, уложил {raidToday.kills} из {RAID_FIGHTS}, добыча {raidToday.loot} кр. Завтра снова.
          </Txt>
        ) : confirm === 'raid' ? (
          <>
            <Txt color={colors.red}>Точно? Три боя подряд, лечиться негде. Проиграешь — вынесут обратно с тем, что успел взять.</Txt>
            <View style={styles.row}>
              <Button title="В рейд" onPress={onRaid} />
              <Button title="Передумал" variant="secondary" onPress={() => setConfirm(null)} />
            </View>
          </>
        ) : (
          <>
            <Button title={`Выйти наверх, в ${TOWNS_BY_ID[target].name}`} onPress={() => setConfirm('raid')} disabled={!canRaid.ok || !!mining} />
            {!canRaid.ok ? <Txt variant="small">{canRaid.reason}</Txt> : null}
          </>
        )}
        {raids.won > 0 || raids.defended > 0 ? (
          <Txt variant="small" color={colors.textDim}>
            Полных рейдов: {raids.won}. Отбито налётов: {raids.defended}.
          </Txt>
        ) : null}
      </Card>

      <Card title="Кости">
        <Txt variant="small">
          Лавки скупают по дневной цене. Макар берёт кости в счёт ремонта, лекарь варит на костной муке зелья. У тебя: {character.resources.bones} шт.
        </Txt>
      </Card>

      <View style={styles.roads}>
        <Button title={`В Город · ${routeBetween('crypt', 'city')?.minutes ?? 2} мин`} variant="secondary" onPress={() => go('city')} disabled={!!mining || raidActive} />
        <Button title={`В Брод · ${routeBetween('crypt', 'brod')?.minutes ?? 3} мин`} variant="secondary" onPress={() => go('brod')} disabled={!!mining || raidActive} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingTop: spacing.sm },
  links: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  news: { borderColor: colors.gold },
  raid: { borderColor: colors.red },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  roads: { flexDirection: 'row', gap: spacing.sm },
  floor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  floorNext: { borderColor: colors.goldDim, backgroundColor: colors.bgElevated },
  floorDone: { opacity: 0.8 },
});
