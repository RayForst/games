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
import {
  alignmentName,
  chainFinished,
  getItem,
  rewardText,
  sortedProgress,
  stepProgress,
  STORY_BY_ID,
  storyStep,
  type StoryId,
  type StoryProgress,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { playSfx } from '@/ui/sfx';
import { colors, radius, spacing } from '@/ui/theme';

const itemName = (id: string) => getItem(id).name;

/** Дела: сюжетные линии пивной — текущий шаг, развилки кнопками, награда за пройденную линию. */
export default function StoryScreen() {
  const character = useGame((s) => s.character);
  const story = useGame((s) => s.story);
  const inGuild = useGame((s) => !!s.guild);
  const ensureStory = useGame((s) => s.ensureStory);
  const chooseStory = useGame((s) => s.chooseStory);
  const claimStory = useGame((s) => s.claimStory);
  const [flash, show] = useFlash(2500);

  // Открыть доступные линии и закрыть шаги по состоянию (уровень, ресурсы, место).
  useEffect(() => {
    ensureStory();
  }, [ensureStory]);

  if (!character) return null;

  const onChoose = (id: StoryId, option: 0 | 1) => {
    const r = chooseStory(id, option);
    if (!r.ok) show(r.reason ?? 'Не получилось');
    else playSfx('coin');
  };

  const onClaim = (id: StoryId) => {
    const r = claimStory(id);
    if (r.ok) playSfx('coin');
    show(r.ok ? `Забрал: ${rewardText(STORY_BY_ID[id].reward, itemName)}` : (r.reason ?? 'Не получилось'));
  };

  const list = sortedProgress(story);

  return (
    <Screen>
      <BackBar title="Пивная" right={<Kredits value={character.kredits} />} />
      <View>
        <Txt variant="title">Дела</Txt>
        <Txt variant="muted">
          Кто что просит, кому что должен. За глаза тебя зовут «{alignmentName(character.alignment)}» — выбор на развилках это меняет.
        </Txt>
      </View>

      <Flash text={flash} />

      {list.length === 0 ? (
        <Card>
          <Txt variant="muted">Пока никому до тебя нет дела. Подерись — заметят.</Txt>
        </Card>
      ) : null}

      {list.map((p) => (
        <ChainCard key={p.id} p={p} character={character} inGuild={inGuild} onChoose={onChoose} onClaim={onClaim} />
      ))}
    </Screen>
  );
}

interface ChainProps {
  p: StoryProgress;
  character: NonNullable<ReturnType<typeof useGame.getState>['character']>;
  inGuild: boolean;
  onChoose: (id: StoryId, option: 0 | 1) => void;
  onClaim: (id: StoryId) => void;
}

function ChainCard({ p, character, inGuild, onChoose, onClaim }: ChainProps) {
  const chain = STORY_BY_ID[p.id];
  const finished = chainFinished(p);
  const step = storyStep(p);
  const total = chain.steps.length;
  const [done, need] = step ? stepProgress(step, p, { character, inGuild }) : [1, 1];
  // Последняя сделанная развилка — показать, чем кончилось.
  const lastFork = [...chain.steps].reverse().find((s) => s.condition.kind === 'choice' && p.choices[s.id] !== undefined);
  const lastOutcome = lastFork?.choices?.[p.choices[lastFork.id]!]?.outcome;

  return (
    <Card
      title={chain.title}
      right={
        <Txt variant="small" color={p.claimed ? colors.textDim : finished ? colors.green : colors.gold}>
          {p.claimed ? 'закрыто' : finished ? 'награда ждёт' : `шаг ${p.step + 1} из ${total}`}
        </Txt>
      }
      style={p.claimed ? styles.claimed : undefined}>
      <Txt variant="small">{chain.giver}</Txt>
      {p.step === 0 && !finished ? <Txt variant="muted">{chain.intro}</Txt> : null}

      {step && !finished ? (
        <View style={styles.step}>
          <Txt bold>{step.task}</Txt>
          <Txt variant="muted">{step.text}</Txt>
          {step.condition.kind === 'choice' && step.choices ? (
            <View style={styles.choices}>
              {step.choices.map((c, i) => (
                <Button key={c.label} small variant={i === 0 ? 'secondary' : 'ghost'} title={c.label} onPress={() => onChoose(p.id, i as 0 | 1)} />
              ))}
            </View>
          ) : (
            <Bar value={done} max={need} height={6} color={colors.gold} showNumbers={need > 1} />
          )}
          {step.reward || step.take ? (
            <Txt variant="small" color={colors.gold}>
              {step.take?.resource ? `отдать ${step.take.resource.amount} шт. · ` : ''}
              {rewardText(step.reward, itemName)}
            </Txt>
          ) : null}
        </View>
      ) : null}

      {lastOutcome && !p.claimed ? (
        <Txt variant="small" style={styles.outcome}>
          {lastOutcome}
        </Txt>
      ) : null}

      {finished && !p.claimed ? (
        <View style={styles.step}>
          <Txt variant="muted">{chain.outro}</Txt>
          <Button small title={`Забрать · ${rewardText(chain.reward, itemName)}`} onPress={() => onClaim(p.id)} />
        </View>
      ) : null}
      {p.claimed ? <Txt variant="small">Пройдено. {rewardText(chain.reward, itemName)}</Txt> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  step: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    gap: spacing.xs,
  },
  choices: { gap: spacing.xs, marginTop: spacing.xs },
  outcome: { fontStyle: 'italic' },
  claimed: { opacity: 0.6 },
});
