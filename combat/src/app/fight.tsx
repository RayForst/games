import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { FighterCard } from '@/components/FighterCard';
import { FightLog } from '@/components/FightLog';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { ZonePicker } from '@/components/ZonePicker';
import { BLOCK_LABELS, deriveCharacter, ZONE_LABELS, type Block, type Zone } from '@/game';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

export default function FightScreen() {
  const character = useGame((s) => s.character);
  const fight = useGame((s) => s.fight);
  const playTurn = useGame((s) => s.playTurn);
  const endFight = useGame((s) => s.endFight);

  const [attack, setAttack] = useState<Zone | null>(null);
  const [block, setBlock] = useState<Block | null>(null);

  const status = fight?.status;
  useEffect(() => {
    if (!status || status === 'active') return;
    const type =
      status === 'won' ? Haptics.NotificationFeedbackType.Success : status === 'lost' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Warning;
    Haptics.notificationAsync(type).catch(() => {});
  }, [status]);

  // Боя нет (закончили или открыли экран напрямую) — уходим в зал. Единственный путь навигации отсюда.
  // dismissTo закрывает модалку и возвращает к уже открытым табам, а не создаёт их вторую копию.
  useEffect(() => {
    if (!fight) router.dismissTo('/(tabs)/arena');
  }, [fight]);

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

  return (
    <Screen>
      <FighterCard name={character.name} level={character.level} hp={fight.playerHp} derived={derived} side="player" />
      <View style={styles.vsRow}>
        <View style={styles.vsLine} />
        <Txt variant="small" style={styles.vs}>
          {fight.status === 'active' ? `РАУНД ${fight.turn}` : 'БОЙ ОКОНЧЕН'}
        </Txt>
        <View style={styles.vsLine} />
      </View>
      <FighterCard name={o.name} level={o.level} hp={fight.enemyHp} derived={o.derived} side="enemy" />

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
        </>
      ) : (
        <ResultCard status={fight.status} reward={fight.reward} onLeave={leave} />
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
}: {
  status: 'won' | 'lost' | 'draw';
  reward: { exp: number; kredits: number; levelsGained: number } | null;
  onLeave: () => void;
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
        </Txt>
      ) : null}
      {reward && reward.levelsGained > 0 ? (
        <Txt center variant="gold">
          Уровень повышен! Раскидай {reward.levelsGained * 3} очка на экране персонажа.
        </Txt>
      ) : null}
      <Button title="Вернуться в зал" onPress={onLeave} />
    </Card>
  );
}

const styles = StyleSheet.create({
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vsLine: { flex: 1, height: 1, backgroundColor: colors.border },
  vs: { letterSpacing: 2, color: colors.textDim },
  strike: { paddingVertical: 16 },
  result: { borderWidth: 2, gap: spacing.md },
});
