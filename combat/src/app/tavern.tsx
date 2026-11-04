import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Flash } from '@/components/Flash';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { BUILDINGS_BY_ID, dailyRumors, questDone, questReward, questTitle } from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { colors, radius, spacing } from '@/ui/theme';

/** Пивная: три задания на день и слухи завсегдатаев. */
export default function TavernScreen() {
  const character = useGame((s) => s.character);
  const quests = useGame((s) => s.quests);
  const ensureQuests = useGame((s) => s.ensureQuests);
  const claimQuest = useGame((s) => s.claimQuest);
  const [flash, show] = useFlash(2500);

  // Доска на сегодня создаётся при входе (и пересоздаётся, если наступил новый день).
  useEffect(() => {
    ensureQuests();
  }, [ensureQuests]);

  if (!character) return null;

  const onClaim = (id: string) => {
    const r = claimQuest(id);
    show(r.ok ? `Хозяйка отсчитала ${r.kredits} кр.` : (r.reason ?? 'Не получилось'));
  };

  return (
    <Screen>
      <BackBar right={<Kredits value={character.kredits} />} />
      <View>
        <Txt variant="title">Пивная</Txt>
        <Txt variant="muted">{BUILDINGS_BY_ID.tavern.description}</Txt>
      </View>

      <Flash text={flash} />

      <Card title="Задания на сегодня" right={<Txt variant="small">обновятся завтра</Txt>}>
        {quests?.quests.map((q) => {
          const done = questDone(q);
          const reward = questReward(q, character.level);
          return (
            <View key={q.id} style={[styles.quest, q.claimed && styles.questClaimed]}>
              <View style={styles.questHead}>
                <Txt bold style={styles.flex}>
                  {questTitle(q)}
                </Txt>
                <Txt variant="small" color={colors.gold}>
                  +{reward.kredits} кр. · +{reward.exp} оп.
                </Txt>
              </View>
              <Bar value={q.progress} max={q.target} height={6} color={done ? colors.green : colors.gold} />
              {q.claimed ? (
                <Txt variant="small">Выполнено, награда получена.</Txt>
              ) : done ? (
                <Button small title="Забрать награду" onPress={() => onClaim(q.id)} />
              ) : null}
            </View>
          );
        })}
      </Card>

      <Card title="Слухи">
        {dailyRumors(quests?.day ?? '').map((r) => (
          <Txt key={r} variant="muted" style={styles.rumor}>
            «{r}»
          </Txt>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  quest: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    gap: spacing.xs,
  },
  questClaimed: { opacity: 0.55 },
  questHead: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  rumor: { fontStyle: 'italic' },
});
