import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Flash } from '@/components/Flash';
import { GiIcon } from '@/components/GiIcon';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { alignmentName, BUILDINGS_BY_ID, chainFinished, dailyRumors, questDone, questReward, questTitle, sortedProgress, STORY_BY_ID, storyAttention, storyStep, unreadCount } from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { playSfx } from '@/ui/sfx';
import { colors, radius, spacing } from '@/ui/theme';

/** Пивная: три задания на день и слухи завсегдатаев. */
export default function TavernScreen() {
  const character = useGame((s) => s.character);
  const quests = useGame((s) => s.quests);
  const ensureQuests = useGame((s) => s.ensureQuests);
  const advanceTutorial = useGame((s) => s.advanceTutorial);
  const claimQuest = useGame((s) => s.claimQuest);
  const unread = useGame((s) => unreadCount(s.chat, s.chatSeenAt));
  const guild = useGame((s) => s.guild);
  const story = useGame((s) => s.story);
  const ensureStory = useGame((s) => s.ensureStory);
  const [flash, show] = useFlash(2500);

  // Доска на сегодня создаётся при входе (и пересоздаётся, если наступил новый день).
  useEffect(() => {
    ensureQuests();
    // Сюжет: открыть доступные линии и закрыть шаги по состоянию.
    ensureStory();
    // Обучение: визит в пивную — последний шаг.
    advanceTutorial({ tavernVisited: true });
  }, [ensureQuests, ensureStory, advanceTutorial]);

  if (!character) return null;

  // «Дела»: первая линия, требующая внимания (развилка или награда), иначе первая идущая.
  const attention = storyAttention(story);
  const active = sortedProgress(story).filter((p) => !p.claimed);
  const top = active[0];
  const topStep = top ? storyStep(top) : null;
  const topLine = !top
    ? 'Пока никому до тебя нет дела. Подерись — заметят.'
    : chainFinished(top)
      ? `«${STORY_BY_ID[top.id].title}»: пройдено, награда ждёт.`
      : top.awaiting
        ? `«${STORY_BY_ID[top.id].title}»: развилка, нужен твой выбор.`
        : `«${STORY_BY_ID[top.id].title}»: ${topStep?.task ?? ''}`;

  const onClaim = (id: string) => {
    const r = claimQuest(id);
    if (r.ok) playSfx('coin');
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

      <Card title="Дела" right={<Txt variant="small" color={attention > 0 ? colors.gold : colors.textMuted}>{attention > 0 ? `ждут: ${attention}` : `линий: ${active.length}`}</Txt>}>
        <Txt variant="muted">{topLine}</Txt>
        <Txt variant="small">За глаза тебя зовут «{alignmentName(character.alignment)}».</Txt>
        <Button small variant={attention > 0 ? 'primary' : 'secondary'} title="К делам" onPress={() => router.push('/story')} />
      </Card>

      <View style={styles.doors}>
        <Card style={styles.door} title="Общий стол" right={<GiIcon name="chat" size={22} />}>
          <Txt variant="small">{unread > 0 ? `Непрочитанных: ${unread}` : 'Завсегдатаи болтают.'}</Txt>
          <Button small variant="secondary" title="В чат" onPress={() => router.push('/chat')} />
        </Card>
        <Card style={styles.door} title="Задняя комната" right={<GiIcon name="guild" size={22} />}>
          <Txt variant="small">{guild ? `[${guild.tag}] ${guild.name}` : 'Гильдии: основать или вступить.'}</Txt>
          <Button small variant="secondary" title="Гильдии" onPress={() => router.push('/guild')} />
        </Card>
      </View>

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
  doors: { flexDirection: 'row', gap: spacing.md },
  door: { flex: 1 },
});
