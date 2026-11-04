import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Bar } from './Bar';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { Flash } from './Flash';
import { Txt } from './Txt';
import {
  deriveCharacter,
  jobRatePerHour,
  MINE_SHIFT_HOURS,
  mineEarnings,
  mineIsDone,
  mineProgress,
  mineSecondsLeft,
  type JobId,
  type ShiftHours,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { formatDuration } from '@/ui/format';
import { colors, spacing } from '@/ui/theme';

interface Props {
  job: JobId;
  /** Тексты под конкретную работу. */
  rateHint: string;
  idleHint: string;
  startTitle: (hours: number) => string;
  workingTitle: string;
  collectedText: (kredits: number) => string;
  /** Что делать, если сбор обернулся боем (караван). */
  onAmbush?: () => void;
}

/** Работа по времени: выбрать смену, следить за прогрессом, забрать плату. Общая для шахты и каравана. */
export function JobPanel({ job, rateHint, idleHint, startTitle, workingTitle, collectedText, onAmbush }: Props) {
  const character = useGame((s) => s.character);
  const mining = useGame((s) => s.mining);
  const startMining = useGame((s) => s.startMining);
  const collectMining = useGame((s) => s.collectMining);
  const now = useNow();
  const [hours, setHours] = useState<ShiftHours>(1);
  const [flash, show] = useFlash(2500);

  if (!character) return null;

  const derived = deriveCharacter(character);
  const rate = jobRatePerHour(job, derived);
  const mine = mining && (mining.job ?? 'mine') === job ? mining : null;
  const busyElsewhere = !!mining && !mine;

  const onStart = () => {
    const r = startMining(hours, job);
    if (!r.ok) Alert.alert('Работа', r.reason ?? 'Не получилось');
  };

  const onCollect = () => {
    const r = collectMining();
    if (!r.ok) {
      Alert.alert('Работа', r.reason ?? 'Не получилось');
      return;
    }
    if (useGame.getState().fight?.status === 'active') {
      onAmbush?.();
      return;
    }
    show(r.kredits ? collectedText(r.kredits) : 'Ты и начать не успел.');
  };

  return (
    <>
      <Flash text={flash} />

      <Card title="Твоя ставка" right={<Txt variant="gold">{rate} кр./ч</Txt>}>
        <Txt variant="small">{rateHint}</Txt>
      </Card>

      {mine ? (
        <Card title={mineIsDone(mine, now) ? 'Смена окончена' : workingTitle} right={<Txt variant="small">смена {mine.hours} ч</Txt>}>
          <Bar
            value={mineProgress(mine, now) * 100}
            max={100}
            color={colors.gold}
            height={10}
            showNumbers={false}
            label={mineIsDone(mine, now) ? 'Отработано полностью' : `Осталось ${formatDuration(mineSecondsLeft(mine, now))}`}
          />
          <Txt>
            Заработано: <Txt variant="gold">{mineEarnings(mine, rate, now)} кр.</Txt>
          </Txt>
          <Button
            title={mineIsDone(mine, now) ? `Забрать ${mineEarnings(mine, rate, now)} кр.` : `Забрать ${mineEarnings(mine, rate, now)} кр. и уйти`}
            onPress={onCollect}
            variant={mineIsDone(mine, now) ? 'primary' : 'secondary'}
          />
        </Card>
      ) : (
        <Card title="Смена">
          <View style={styles.chips}>
            {MINE_SHIFT_HOURS.map((h) => (
              <Chip key={h} label={`${h} ч · ${rate * h} кр.`} active={h === hours} onPress={() => setHours(h)} />
            ))}
          </View>
          <Button title={startTitle(hours)} onPress={onStart} disabled={busyElsewhere} />
          <Txt variant="small">{busyElsewhere ? 'Ты уже занят другой работой. Сначала забери плату там.' : idleHint}</Txt>
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
