import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Flash } from '@/components/Flash';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import {
  BUILDINGS_BY_ID,
  deriveCharacter,
  MINE_SHIFT_HOURS,
  mineEarnings,
  mineIsDone,
  mineProgress,
  mineRatePerHour,
  mineSecondsLeft,
  type ShiftHours,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useNow } from '@/hooks/useNow';
import { useGame } from '@/store/useGame';
import { formatDuration } from '@/ui/format';
import { colors, spacing } from '@/ui/theme';

/** Шахта: отправить персонажа на смену и забрать кредиты. Работает офлайн, по часам телефона. */
export default function MineScreen() {
  const character = useGame((s) => s.character);
  const mining = useGame((s) => s.mining);
  const startMining = useGame((s) => s.startMining);
  const collectMining = useGame((s) => s.collectMining);
  const now = useNow();
  const [hours, setHours] = useState<ShiftHours>(1);
  const [flash, show] = useFlash(2500);

  if (!character) return null;

  const derived = deriveCharacter(character);
  const rate = mineRatePerHour(derived);

  const onStart = () => {
    const r = startMining(hours);
    if (!r.ok) Alert.alert('Шахта', r.reason ?? 'Не получилось');
  };

  const onCollect = () => {
    const r = collectMining();
    if (!r.ok) {
      Alert.alert('Шахта', r.reason ?? 'Не получилось');
      return;
    }
    show(r.kredits ? `+${r.kredits} кр. Смена засчитана.` : 'Ты и кирку поднять не успел.');
  };

  return (
    <Screen>
      <BackBar right={<Kredits value={character.kredits} />} />
      <View>
        <Txt variant="title">Шахта</Txt>
        <Txt variant="muted">{BUILDINGS_BY_ID.mine.description}</Txt>
      </View>

      <Flash text={flash} />

      <Card title="Твоя ставка" right={<Txt variant="gold">{rate} кр./ч</Txt>}>
        <Txt variant="small">
          Сила {derived.stats.strength} машет киркой, выносливость {derived.stats.endurance} держит темп. Прокачаешь — платить будут больше.
        </Txt>
      </Card>

      {mining ? (
        <ShiftCard
          done={mineIsDone(mining, now)}
          progress={mineProgress(mining, now)}
          left={mineSecondsLeft(mining, now)}
          earned={mineEarnings(mining, rate, now)}
          hours={mining.hours}
          onCollect={onCollect}
        />
      ) : (
        <Card title="Смена">
          <View style={styles.chips}>
            {MINE_SHIFT_HOURS.map((h) => (
              <Chip key={h} label={`${h} ч · ${rate * h} кр.`} active={h === hours} onPress={() => setHours(h)} />
            ))}
          </View>
          <Button title={`Спуститься на ${hours} ч`} onPress={onStart} />
          <Txt variant="small">
            Пока ты в шахте, арена закрыта. Уйти можно раньше: заплатят за отработанное. Здоровье восстанавливается как обычно.
          </Txt>
        </Card>
      )}
    </Screen>
  );
}

function ShiftCard({
  done,
  progress,
  left,
  earned,
  hours,
  onCollect,
}: {
  done: boolean;
  progress: number;
  left: number;
  earned: number;
  hours: number;
  onCollect: () => void;
}) {
  return (
    <Card title={done ? 'Смена окончена' : 'Ты в шахте'} right={<Txt variant="small">смена {hours} ч</Txt>}>
      <Bar
        value={progress * 100}
        max={100}
        color={colors.gold}
        height={10}
        showNumbers={false}
        label={done ? 'Отработано полностью' : `Осталось ${formatDuration(left)}`}
      />
      <Txt>
        Заработано: <Txt variant="gold">{earned} кр.</Txt>
      </Txt>
      <Button title={done ? `Забрать ${earned} кр.` : `Забрать ${earned} кр. и уйти`} onPress={onCollect} variant={done ? 'primary' : 'secondary'} />
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
