import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FighterCard } from '@/components/FighterCard';
import { FightLog } from '@/components/FightLog';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { ZonePicker } from '@/components/ZonePicker';
import { BLOCK_LABELS, deriveCharacter, TOURNAMENT_ROUNDS, ZONE_LABELS, type Block, type Zone } from '@/game';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

export default function FightScreen() {
  const character = useGame((s) => s.character);
  const fight = useGame((s) => s.fight);
  const playTurn = useGame((s) => s.playTurn);
  const endFight = useGame((s) => s.endFight);
  const surrender = useGame((s) => s.surrender);
  const tournament = useGame((s) => s.tournament);
  const startTournamentFight = useGame((s) => s.startTournamentFight);

  const [attack, setAttack] = useState<Zone | null>(null);
  const [block, setBlock] = useState<Block | null>(null);

  const status = fight?.status;
  useEffect(() => {
    if (!status || status === 'active') return;
    const type =
      status === 'won' ? Haptics.NotificationFeedbackType.Success : status === 'lost' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Warning;
    Haptics.notificationAsync(type).catch(() => {});
  }, [status]);

  // Откуда пришли, туда и вернёмся: арена или замок. Стор помнит это и после того, как бой закрыт.
  const lastContext = useGame((s) => s.lastFightContext);

  // Боя нет (закончили или открыли экран напрямую) — уходим назад. Единственный путь навигации отсюда.
  // dismissTo закрывает модалку и возвращает к уже открытым экранам, а не создаёт их вторую копию.
  useEffect(() => {
    if (!fight) router.dismissTo(lastContext === 'tournament' ? '/castle' : lastContext === 'forest' ? '/(tabs)/city' : '/arena');
  }, [fight, lastContext]);

  // Крит по кому угодно — тяжёлая вибрация. Хук стоит до раннего выхода.
  const lastCrit = !!fight?.lastStrikes?.some((s) => s.outcome === 'crit' || s.outcome === 'crit-through-block');
  const turn = fight?.turn;
  useEffect(() => {
    if (lastCrit) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, [lastCrit, turn]);

  if (!character || !fight) return null;

  const derived = deriveCharacter(character);
  const o = fight.opponent;
  const ready = attack !== null && block !== null && fight.status === 'active';

  const strike = () => {
    if (!attack || !block) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    playTurn({ attack, block });
  };


  const leave = () => endFight();
  const giveUp = () => {
    Alert.alert('Сдаться?', 'Засчитают поражение: рейтинг −4, опыта крохи, и травму никто не отменял.', [
      { text: 'Драться', style: 'cancel' },
      { text: 'Сдаться', style: 'destructive', onPress: surrender },
    ]);
  };
  const inTournament = fight.context === 'tournament';
  // Удар игрока прилетает в соперника, удар соперника — в игрока.
  const [playerStrike, enemyStrike] = fight.lastStrikes ?? [null, null];
  const tournamentGoesOn = inTournament && tournament?.status === 'active' && fight.status === 'won';
  const nextFight = () => {
    const r = startTournamentFight();
    if (!r.ok) endFight();
  };

  return (
    <Screen>
      <FighterCard name={character.name} level={character.level} hp={fight.playerHp} derived={derived} side="player" lastStrike={enemyStrike} strikeKey={fight.turn} />
      <View style={styles.vsRow}>
        <View style={styles.vsLine} />
        <Txt variant="small" style={styles.vs}>
          {inTournament ? `ТУРНИР ${Math.min((tournament?.stage ?? 0) + (fight.status === 'won' ? 0 : 1), TOURNAMENT_ROUNDS)}/${TOURNAMENT_ROUNDS} · ` : fight.context === 'forest' ? 'ЗАСАДА · ' : ''}
          {fight.status === 'active' ? `РАУНД ${fight.turn}` : 'БОЙ ОКОНЧЕН'}
        </Txt>
        <View style={styles.vsLine} />
      </View>
      <FighterCard name={o.name} level={o.level} hp={fight.enemyHp} derived={o.derived} side="enemy" lastStrike={playerStrike} strikeKey={fight.turn} />

      {fight.status === 'active' ? (
        <>
          <ZonePicker attack={attack} block={block} onAttack={setAttack} onBlock={setBlock} />
          {fight.lastEnemyMove ? (
            <Txt variant="small" center>
              Прошлый раунд {o.name}: удар {ZONE_LABELS[fight.lastEnemyMove.attack].toLowerCase()}, блок{' '}
              {BLOCK_LABELS[fight.lastEnemyMove.block].toLowerCase()}
            </Txt>
          ) : (
            <Txt variant="small" center>
              Выбери, куда бить и что закрыть.
            </Txt>
          )}
          <Button title="Удар!" onPress={strike} disabled={!ready} variant="danger" style={styles.strike} />
          <Button title="Сдаться" onPress={giveUp} variant="ghost" small style={styles.surrender} />
        </>
      ) : (
        <ResultCard status={fight.status} reward={fight.reward} onLeave={leave} onNext={tournamentGoesOn ? nextFight : undefined} leaveTitle={inTournament ? 'В замок' : fight.context === 'forest' ? 'В лес' : 'Вернуться в зал'} />
      )}

      <Card title="Ход боя">
        <FightLog log={fight.log} />
      </Card>
    </Screen>
  );
}

function ResultCard({
  status,
  reward,
  onLeave,
  onNext,
  leaveTitle,
}: {
  status: 'won' | 'lost' | 'draw';
  reward: { exp: number; kredits: number; levelsGained: number; rating?: number; title?: string; loot?: string } | null;
  onLeave: () => void;
  onNext?: () => void;
  leaveTitle: string;
}) {
  const title = status === 'won' ? 'Победа!' : status === 'lost' ? 'Поражение' : 'Ничья';
  const color = status === 'won' ? colors.green : status === 'lost' ? colors.red : colors.gold;
  return (
    <Card style={[styles.result, { borderColor: color }]}>
      <Txt variant="title" center color={color}>
        {title}
      </Txt>
      {reward ? (
        <Txt center>
          +{reward.exp} опыта · +{reward.kredits} кр.
          {reward.rating !== undefined ? ` · рейтинг ${reward.rating >= 0 ? '+' : ''}${reward.rating}` : ''}
        </Txt>
      ) : null}
      {reward?.title ? (
        <Txt center variant="gold">
          Титул: «{reward.title}»
        </Txt>
      ) : null}
      {reward?.loot ? (
        <Txt center color={colors.green}>
          Трофей: {reward.loot} — в рюкзаке
        </Txt>
      ) : null}
      {reward && reward.levelsGained > 0 ? (
        <Txt center variant="gold">
          Уровень повышен! Раскидай {reward.levelsGained * 3} очка на экране персонажа.
        </Txt>
      ) : null}
      {onNext ? <Button title="Следующий бой" onPress={onNext} variant="danger" /> : null}
      <Button title={leaveTitle} onPress={onLeave} variant={onNext ? 'secondary' : 'primary'} />
    </Card>
  );
}

const styles = StyleSheet.create({
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vsLine: { flex: 1, height: 1, backgroundColor: colors.border },
  vs: { letterSpacing: 2, color: colors.textDim },
  strike: { paddingVertical: 16 },
  surrender: { alignSelf: 'center' },
  result: { borderWidth: 2, gap: spacing.md },
});
