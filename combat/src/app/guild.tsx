import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Flash } from '@/components/Flash';
import { GiIcon } from '@/components/GiIcon';
import { Input } from '@/components/Input';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import {
  canFoundGuild,
  canManage,
  canRecruitRival,
  canUpgradeGuild,
  dayKey,
  GUILD_EMBLEMS,
  GUILD_FOUND_COST,
  GUILD_MAX_LEVEL,
  GUILD_MIN_LEVEL,
  guildLadder,
  guildLevelCost,
  guildPerks,
  isLeader,
  joinCheck,
  ladderPlace,
  RANK_LABELS,
  recruitCost,
  RIVALS,
  rivalRecord,
  validateGuildName,
  validateGuildTag,
  type Guild,
  type GuildEmblem,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { SKIRMISHES_PER_DAY, useGame } from '@/store/useGame';
import { plural } from '@/ui/format';
import { colors, radius, spacing } from '@/ui/theme';

/** Гильдейский стол в задней комнате пивной: основать, вступить, править свою, драться с чужими. */
export default function GuildScreen() {
  const character = useGame((s) => s.character);
  const guild = useGame((s) => s.guild);
  const [flash, show] = useFlash(2500);
  if (!character) return null;
  return (
    <Screen>
      <BackBar title="Назад" right={<Kredits value={character.kredits} />} />
      <View>
        <Txt variant="title">Гильдии</Txt>
        <Txt variant="muted">Задняя комната пивной. Здесь делят казну, славу и чужие зубы.</Txt>
      </View>
      <Flash text={flash} />
      {guild ? <MyGuild guild={guild} show={show} /> : <NoGuild show={show} />}
      <Ladder />
      <Txt variant="small" center color={colors.textDim}>
        Пока сервера нет, в гильдиях местные: именные соперники с арены и три гильдии города. Живые люди встанут в тот же список.
      </Txt>
    </Screen>
  );
}

function NoGuild({ show }: { show: (t: string) => void }) {
  const character = useGame((s) => s.character)!;
  const npcGuilds = useGame((s) => s.npcGuilds);
  const foundGuild = useGame((s) => s.foundGuild);
  const joinGuild = useGame((s) => s.joinGuild);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [motto, setMotto] = useState('');
  const [emblem, setEmblem] = useState<GuildEmblem>('wolf');

  const entry = canFoundGuild(character);
  const nameCheck = name ? validateGuildName(name, npcGuilds.map((g) => g.name)) : { ok: false, reason: 'Название' };
  const tagCheck = tag ? validateGuildTag(tag, npcGuilds.map((g) => g.tag)) : { ok: false, reason: 'Тег' };
  const ready = entry.ok && nameCheck.ok && tagCheck.ok;

  const found = () => {
    const r = foundGuild(name, tag, emblem, motto);
    show(r.ok ? `Гильдия «${name.trim()}» основана. Стол ваш.` : (r.reason ?? 'Не получилось'));
  };

  return (
    <>
      <Card title="Основать гильдию" right={<Txt variant="small">{GUILD_FOUND_COST} кр. · с {GUILD_MIN_LEVEL} ур.</Txt>}>
        <Input value={name} onChangeText={setName} placeholder="Название, например Ночные Псы" maxLength={18} autoCapitalize="words" />
        <View style={styles.row}>
          <Input value={tag} onChangeText={(t) => setTag(t.toUpperCase())} placeholder="ТЕГ" maxLength={4} autoCapitalize="characters" style={styles.tagInput} />
          <Input value={motto} onChangeText={setMotto} placeholder="Девиз (не обязательно)" maxLength={60} style={styles.flex} />
        </View>
        <View style={styles.emblems}>
          {GUILD_EMBLEMS.map((e) => (
            <Pressable key={e.id} onPress={() => setEmblem(e.id)} accessibilityRole="button" accessibilityLabel={`Эмблема: ${e.name}`} style={[styles.emblem, emblem === e.id && styles.emblemActive]}>
              <GiIcon name={e.id} size={28} color={emblem === e.id ? colors.gold : colors.textMuted} />
            </Pressable>
          ))}
        </View>
        <Txt variant="small">
          {!entry.ok ? entry.reason : !nameCheck.ok ? nameCheck.reason : !tagCheck.ok ? tagCheck.reason : `[${tag}] ${name.trim()} — так тебя будут звать в чате.`}
        </Txt>
        <Button title={`Основать · ${GUILD_FOUND_COST} кр.`} onPress={found} disabled={!ready} />
      </Card>

      <Card title="Вступить к местным">
        {npcGuilds.map((g) => {
          const chk = joinCheck(character, g);
          return (
            <View key={g.id} style={styles.guildRow}>
              <GiIcon name={g.emblem} size={30} color={colors.textMuted} />
              <View style={styles.flex}>
                <Txt bold>
                  [{g.tag}] {g.name} · {g.level} ур.
                </Txt>
                <Txt variant="small">
                  {g.members.length} {plural(g.members.length, ['боец', 'бойца', 'бойцов'])} · слава {g.rating} · «{g.motto}»
                </Txt>
                {!chk.ok ? (
                  <Txt variant="small" color={colors.red}>
                    {chk.reason}
                  </Txt>
                ) : null}
              </View>
              <Button
                small
                variant="secondary"
                title="Вступить"
                disabled={!chk.ok}
                onPress={() => {
                  const r = joinGuild(g.id);
                  show(r.ok ? `Ты в «${g.name}». Глава решает, казна общая.` : (r.reason ?? 'Не взяли'));
                }}
              />
            </View>
          );
        })}
        <Txt variant="small">В чужой гильдии ты боец, не глава: без права звать и выгонять, зато с бонусами уровня и общей казной.</Txt>
      </Card>
    </>
  );
}

function MyGuild({ guild, show }: { guild: Guild; show: (t: string) => void }) {
  const character = useGame((s) => s.character)!;
  const npcGuilds = useGame((s) => s.npcGuilds);
  const skirmishes = useGame((s) => s.skirmishes);
  const mining = useGame((s) => s.mining);
  const donateGuild = useGame((s) => s.donateGuild);
  const upgradeGuild = useGame((s) => s.upgradeGuild);
  const inviteRival = useGame((s) => s.inviteRival);
  const kickMember = useGame((s) => s.kickMember);
  const setMemberRank = useGame((s) => s.setMemberRank);
  const setGuildMotto = useGame((s) => s.setGuildMotto);
  const startSkirmish = useGame((s) => s.startSkirmish);
  const leaveGuild = useGame((s) => s.leaveGuild);
  const disbandGuild = useGame((s) => s.disbandGuild);
  const [motto, setMotto] = useState(guild.motto);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const leader = isLeader(guild);
  const manager = canManage(guild);
  const perks = guildPerks(guild.level);
  const nextPerks = guild.level < GUILD_MAX_LEVEL ? guildPerks(guild.level + 1) : null;
  const upgrade = canUpgradeGuild(guild);
  const today = skirmishes && skirmishes.day === dayKey() ? skirmishes.count : 0;
  const place = ladderPlace(guild, npcGuilds);

  const act = (r: { ok: boolean; reason?: string }, okText: string) => show(r.ok ? okText : (r.reason ?? 'Не получилось'));

  const fight = (id: string, name: string) => {
    const r = startSkirmish(id);
    if (!r.ok) {
      show(r.reason ?? 'Не получилось');
      return;
    }
    show(`Стычка с «${name}»`);
    router.push('/fight');
  };

  const leave = () => {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    const r = leader ? disbandGuild() : leaveGuild();
    setConfirmLeave(false);
    act(r, leader ? 'Гильдия распущена.' : 'Ты ушёл.');
  };

  return (
    <>
      <Card style={styles.hot}>
        <View style={styles.guildRow}>
          <GiIcon name={guild.emblem} size={44} />
          <View style={styles.flex}>
            <Txt variant="heading">
              [{guild.tag}] {guild.name}
            </Txt>
            <Txt variant="small" color={colors.gold}>
              {guild.level} уровень · {place}-е место · слава {guild.rating}
            </Txt>
            <Txt variant="small">
              Опыт ×{perks.expMult} · кредиты ×{perks.kreditsMult} · мест {perks.maxMembers}
            </Txt>
          </View>
        </View>
        {manager ? (
          <View style={styles.row}>
            <Input value={motto} onChangeText={setMotto} placeholder="Девиз" maxLength={60} style={styles.flex} />
            <Button small variant="secondary" title="Записать" disabled={motto.trim() === guild.motto} onPress={() => act(setGuildMotto(motto), 'Девиз записан.')} />
          </View>
        ) : guild.motto ? (
          <Txt variant="muted">«{guild.motto}»</Txt>
        ) : null}
      </Card>

      <Card title="Казна" right={<Txt variant="gold">{guild.treasury} кр.</Txt>}>
        <View style={styles.row}>
          {[50, 200].map((sum) => (
            <Button key={sum} small variant="secondary" title={`Внести ${sum}`} disabled={character.kredits < sum} onPress={() => act(donateGuild(sum), `+${sum} кр. в казну.`)} />
          ))}
          <Button small variant="secondary" title="Внести всё" disabled={character.kredits <= 0} onPress={() => act(donateGuild(character.kredits), 'Всё в казну. Красиво.')} />
        </View>
        {nextPerks ? (
          <>
            <Txt variant="small">
              Следующий уровень: {guildLevelCost(guild.level)} кр. из казны. Даст опыт ×{nextPerks.expMult}, кредиты ×{nextPerks.kreditsMult}, мест {nextPerks.maxMembers}.
            </Txt>
            {leader ? <Button small title={`Поднять уровень · ${guildLevelCost(guild.level)} кр.`} disabled={!upgrade.ok} onPress={() => act(upgradeGuild(), `Гильдия теперь ${guild.level + 1} уровня.`)} /> : null}
          </>
        ) : (
          <Txt variant="small">Выше некуда: {GUILD_MAX_LEVEL} уровень.</Txt>
        )}
      </Card>

      <Card title={`Состав ${guild.members.length}/${perks.maxMembers}`}>
        {guild.members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={styles.flex}>
              <Txt bold color={m.player ? colors.gold : colors.text}>
                {m.name}
              </Txt>
              <Txt variant="small">
                {RANK_LABELS[m.rank]} · {m.level} ур.
              </Txt>
            </View>
            {leader && !m.player ? (
              <Button
                small
                variant="ghost"
                title={m.rank === 'officer' ? 'В бойцы' : 'В десятники'}
                onPress={() => act(setMemberRank(m.id, m.rank === 'officer' ? 'member' : 'officer'), 'Ранг изменён.')}
              />
            ) : null}
            {manager && !m.player && m.rank !== 'leader' ? <Button small variant="secondary" title="Выгнать" onPress={() => act(kickMember(m.id), `${m.name} выгнан.`)} /> : null}
          </View>
        ))}
      </Card>

      {manager ? (
        <Card title="Позвать за стол" right={<Txt variant="small">после {2} побед над ним</Txt>}>
          {RIVALS.map((r) => {
            const rec = rivalRecord(character, r.id);
            const inGuild = guild.members.some((m) => m.rivalId === r.id);
            const chk = canRecruitRival(character, r.id);
            const cost = recruitCost(Math.max(0, character.level + r.levelOffset));
            return (
              <View key={r.id} style={styles.memberRow}>
                <View style={styles.flex}>
                  <Txt bold>{r.name}</Txt>
                  <Txt variant="small">
                    счёт {rec.wins}:{rec.losses} · {inGuild ? 'уже с нами' : chk.ok ? `стол ${cost} кр.` : chk.reason}
                  </Txt>
                </View>
                {!inGuild ? (
                  <Button
                    small
                    variant="secondary"
                    title={`Позвать · ${cost}`}
                    disabled={!chk.ok || character.kredits < cost}
                    onPress={() => act(inviteRival(r.id), `${r.name} сел за ваш стол.`)}
                  />
                ) : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      <Card title="Стычки" right={<Txt variant="small">сегодня {today}/{SKIRMISHES_PER_DAY}</Txt>}>
        <Txt variant="muted">Боец чужой гильдии твоего уровня. Победа — слава ×4 и кредиты в казну и тебе.</Txt>
        {npcGuilds.map((g) => (
          <View key={g.id} style={styles.memberRow}>
            <GiIcon name={g.emblem} size={24} color={colors.textMuted} />
            <View style={styles.flex}>
              <Txt bold>
                [{g.tag}] {g.name}
              </Txt>
              <Txt variant="small">
                {g.level} ур. · слава {g.rating}
              </Txt>
            </View>
            <Button small variant="danger" title="Стычка" disabled={today >= SKIRMISHES_PER_DAY || !!mining} onPress={() => fight(g.id, g.name)} />
          </View>
        ))}
      </Card>

      {guild.log.length > 0 ? (
        <Card title="Летопись">
          {guild.log
            .slice(-8)
            .reverse()
            .map((e) => (
              <Txt key={`${e.at}-${e.text}`} variant="small">
                {e.text}
              </Txt>
            ))}
        </Card>
      ) : null}

      <Button
        variant={confirmLeave ? 'danger' : 'ghost'}
        title={confirmLeave ? (leader ? 'Точно распустить? Казна пропадёт' : 'Точно уйти?') : leader ? 'Распустить гильдию' : 'Покинуть гильдию'}
        onPress={leave}
      />
      {confirmLeave ? <Button variant="secondary" title="Передумал" onPress={() => setConfirmLeave(false)} /> : null}
    </>
  );
}

function Ladder() {
  const guild = useGame((s) => s.guild);
  const npcGuilds = useGame((s) => s.npcGuilds);
  const ladder = guildLadder(guild, npcGuilds);
  return (
    <Card title="Таблица гильдий">
      {ladder.map((g, i) => (
        <View key={g.id} style={styles.memberRow}>
          <Txt variant="mono" color={colors.textDim}>
            {i + 1}.
          </Txt>
          <GiIcon name={g.emblem} size={20} color={guild && g.id === guild.id ? colors.gold : colors.textMuted} />
          <Txt bold style={styles.flex} color={guild && g.id === guild.id ? colors.gold : colors.text}>
            [{g.tag}] {g.name}
          </Txt>
          <Txt variant="small">
            {g.level} ур. · {g.rating}
          </Txt>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' },
  tagInput: { width: 86, textAlign: 'center' },
  emblems: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  emblem: { padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgElevated },
  emblemActive: { borderColor: colors.gold },
  guildRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  memberRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  hot: { borderColor: colors.gold },
});
