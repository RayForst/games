import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { Flash } from '@/components/Flash';
import { GiIcon } from '@/components/GiIcon';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { BACKEND_MODE } from '@/net/backend';
import { can, CHANNELS, ITEMS, LOCATIONS, permissionsOf, ROLE_HINTS, ROLE_LABELS, ROLES, type ChannelId, type Permission } from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

const PERMISSION_LABELS: Record<Permission, string> = {
  'chat.moderate': 'чат: удалять и затыкать',
  'chat.broadcast': 'чат: слово мира',
  'guild.manageAny': 'гильдии: править любые',
  'player.grant': 'персонаж: выдавать',
  'world.control': 'мир: переносить, таймеры, день',
  'role.assign': 'роли',
  'save.reset': 'сейв: сброс',
};

/**
 * Служебный вход: режим мастера игры. Сервера нет, поэтому роль — поле в сейве, а «вход» —
 * щеколда словом, чтобы не нажать случайно. Нужен владельцу, чтобы проверять игру без гринда.
 */
export default function AdminScreen() {
  const account = useGame((s) => s.account);
  const character = useGame((s) => s.character);
  const unlockGm = useGame((s) => s.unlockGm);
  const lockGm = useGame((s) => s.lockGm);
  const setRole = useGame((s) => s.setRole);
  const [word, setWord] = useState('');
  const [flash, show] = useFlash(2500);

  const act = (r: { ok: boolean; reason?: string }, okText: string) => show(r.ok ? okText : (r.reason ?? 'Не получилось'));

  if (!account.gmUnlocked && account.role === 'player') {
    return (
      <Screen>
        <BackBar title="Назад" />
        <View>
          <Txt variant="title">Служебный вход</Txt>
          <Txt variant="muted">Дверь без вывески. Ключник пускает по слову, и то не всех.</Txt>
        </View>
        <Flash text={flash} />
        <Card title="Слово ключника" right={<GiIcon name="key" size={22} />}>
          <Input value={word} onChangeText={setWord} placeholder="Слово" autoCapitalize="none" returnKeyType="done" onSubmitEditing={() => act(unlockGm(word), 'Ключник кивнул. Ты мастер игры.')} />
          <Button title="Войти" disabled={!word.trim()} onPress={() => act(unlockGm(word), 'Ключник кивнул. Ты мастер игры.')} />
          <Txt variant="small">
            Это не защита, а щеколда: сейв лежит на телефоне. Настоящие роли появятся с сервером — тогда роль будет приходить из учётки, а этот экран останется тем же.
          </Txt>
        </Card>
      </Screen>
    );
  }

  const role = account.role;

  return (
    <Screen>
      <BackBar title="Назад" right={<Txt variant="small" color={colors.red}>{ROLE_LABELS[role]}</Txt>} />
      <View>
        <Txt variant="title">Режим мастера</Txt>
        <Txt variant="muted">Роли, выдача, мир, чат и гильдии. Бэкенд: {BACKEND_MODE === 'local' ? 'локальный, сейв на телефоне' : 'сервер'}.</Txt>
      </View>
      <Flash text={flash} />

      <Card title="Роль" right={<GiIcon name="staff" size={22} />}>
        <View style={styles.wrap}>
          {ROLES.map((r) => (
            <Chip key={r} label={ROLE_LABELS[r]} active={r === role} onPress={() => act(setRole(r), `Теперь ты ${ROLE_LABELS[r].toLowerCase()}.`)} />
          ))}
        </View>
        <Txt variant="small">{ROLE_HINTS[role]}</Txt>
        <Txt variant="small" color={colors.textDim}>
          Права: {permissionsOf(role).length > 0 ? permissionsOf(role).map((p) => PERMISSION_LABELS[p]).join(' · ') : 'никаких'}
        </Txt>
        <Button
          small
          variant="ghost"
          title="Закрыть служебный вход"
          onPress={() => {
            lockGm();
            show('Ключник запер дверь. Ты снова игрок.');
          }}
        />
      </Card>

      {character && can(role, 'player.grant') ? <GrantCard act={act} /> : null}
      {character && can(role, 'world.control') ? <WorldCard act={act} /> : null}
      {can(role, 'chat.moderate') || can(role, 'chat.broadcast') ? <ChatCard act={act} /> : null}
      {can(role, 'guild.manageAny') ? <GuildsCard act={act} /> : null}
      {can(role, 'save.reset') ? <SaveCard act={act} /> : null}
    </Screen>
  );
}

type Act = (r: { ok: boolean; reason?: string }, okText: string) => void;

function GrantCard({ act }: { act: Act }) {
  const character = useGame((s) => s.character)!;
  const gmGive = useGame((s) => s.gmGive);
  const gmSetLevel = useGame((s) => s.gmSetLevel);
  const gmHeal = useGame((s) => s.gmHeal);
  const gmGiveItem = useGame((s) => s.gmGiveItem);
  const gmGiveSeals = useGame((s) => s.gmGiveSeals);
  const [showItems, setShowItems] = useState(false);
  return (
    <Card title="Персонаж" right={<Txt variant="small">{character.level} ур. · {character.kredits} кр.</Txt>}>
      <View style={styles.wrap}>
        <Button small variant="secondary" title="+100 кр." onPress={() => act(gmGive('kredits', 100), '+100 кр.')} />
        <Button small variant="secondary" title="+1000 кр." onPress={() => act(gmGive('kredits', 1000), '+1000 кр.')} />
        <Button small variant="secondary" title="+200 опыта" onPress={() => act(gmGive('exp', 200), '+200 опыта')} />
        <Button small variant="secondary" title="+1 уровень" onPress={() => act(gmSetLevel(character.level + 1), `Теперь ${character.level + 1} уровень`)} />
        <Button small variant="secondary" title="+10 ресурсов" onPress={() => act(gmGive('resources', 10), 'По 10 каждого ресурса')} />
        <Button small variant="secondary" title="+20 печатей" onPress={() => act(gmGiveSeals(20), '+20 печатей князя')} />
        <Button small variant="secondary" title="Вылечить" onPress={() => act(gmHeal(), 'Здоров, травм нет')} />
        <Button small variant="ghost" title={showItems ? 'Скрыть вещи' : 'Выдать вещь…'} onPress={() => setShowItems((v) => !v)} />
      </View>
      {showItems ? (
        <View style={styles.wrap}>
          {ITEMS.map((it) => (
            <Chip key={it.id} label={`${it.name} · ${it.level}`} onPress={() => act(gmGiveItem(it.id), `${it.name} в рюкзаке`)} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function WorldCard({ act }: { act: Act }) {
  const character = useGame((s) => s.character)!;
  const mining = useGame((s) => s.mining);
  const gathering = useGame((s) => s.gathering);
  const travel = useGame((s) => s.travel);
  const gmTeleport = useGame((s) => s.gmTeleport);
  const gmFinishTimers = useGame((s) => s.gmFinishTimers);
  const gmNewDay = useGame((s) => s.gmNewDay);
  const timers = [mining && 'смена', gathering && 'сбор', travel && 'дорога'].filter(Boolean).join(', ');
  return (
    <Card title="Мир" right={<Txt variant="small">ты: {character.location}</Txt>}>
      <Txt variant="small">Перенести:</Txt>
      <View style={styles.wrap}>
        {LOCATIONS.map((l) => (
          <Chip key={l.id} label={l.name} active={character.location === l.id} onPress={() => act(gmTeleport(l.id), `Ты в: ${l.name}`)} />
        ))}
      </View>
      <View style={styles.wrap}>
        <Button small variant="secondary" title={timers ? `Завершить: ${timers}` : 'Таймеров нет'} disabled={!timers} onPress={() => act(gmFinishTimers(), 'Таймеры дошли до конца')} />
        <Button small variant="secondary" title="Новый день" onPress={() => act(gmNewDay(), 'Задания, турнир и стычки обнулены')} />
      </View>
    </Card>
  );
}

function ChatCard({ act }: { act: Act }) {
  const role = useGame((s) => s.account.role);
  const chat = useGame((s) => s.chat);
  const gmBroadcast = useGame((s) => s.gmBroadcast);
  const unmuteAuthor = useGame((s) => s.unmuteAuthor);
  const [channel, setChannel] = useState<ChannelId>('tavern');
  const [text, setText] = useState('');
  return (
    <Card title="Чат" right={<GiIcon name="chat" size={22} />}>
      {can(role, 'chat.broadcast') ? (
        <>
          <View style={styles.wrap}>
            {CHANNELS.map((ch) => (
              <Chip key={ch.id} label={ch.name} active={ch.id === channel} onPress={() => setChannel(ch.id)} />
            ))}
          </View>
          <View style={styles.row}>
            <Input value={text} onChangeText={setText} placeholder="Слово мира…" style={styles.flex} />
            <Button
              small
              title="Сказать"
              disabled={!text.trim()}
              onPress={() => {
                act(gmBroadcast(channel, text), 'Мир сказал');
                setText('');
              }}
            />
          </View>
        </>
      ) : null}
      {chat.muted.length > 0 ? (
        <View style={styles.wrap}>
          {chat.muted.map((id) => (
            <Chip key={id} label={`Вернуть голос: ${id}`} onPress={() => act(unmuteAuthor(id), `${id} снова говорит`)} />
          ))}
        </View>
      ) : (
        <Txt variant="small">Заткнутых нет. Удалять и затыкать — в самом чате, там у смотрящего кнопки.</Txt>
      )}
      <Button small variant="ghost" title="Открыть чат" onPress={() => router.push('/chat')} />
    </Card>
  );
}

function GuildsCard({ act }: { act: Act }) {
  const guild = useGame((s) => s.guild);
  const npcGuilds = useGame((s) => s.npcGuilds);
  const gmEditGuild = useGame((s) => s.gmEditGuild);
  const gmDisbandGuild = useGame((s) => s.gmDisbandGuild);
  const [confirm, setConfirm] = useState<string | null>(null);
  const all = guild ? [guild, ...npcGuilds] : npcGuilds;
  return (
    <Card title="Гильдии" right={<GiIcon name="guild" size={22} />}>
      {all.map((g) => (
        <View key={g.id} style={styles.guild}>
          <Txt bold color={guild && g.id === guild.id ? colors.gold : colors.text}>
            [{g.tag}] {g.name} · {g.level} ур. · казна {g.treasury} · слава {g.rating}
          </Txt>
          <View style={styles.wrap}>
            <Button small variant="secondary" title="Ур. +1" onPress={() => act(gmEditGuild(g.id, { level: g.level + 1 }), 'Уровень поднят')} />
            <Button small variant="secondary" title="Ур. −1" onPress={() => act(gmEditGuild(g.id, { level: g.level - 1 }), 'Уровень снижен')} />
            <Button small variant="secondary" title="+500 казна" onPress={() => act(gmEditGuild(g.id, { treasury: g.treasury + 500 }), '+500 в казну')} />
            <Button small variant="secondary" title="+50 славы" onPress={() => act(gmEditGuild(g.id, { rating: g.rating + 50 }), '+50 славы')} />
            <Button
              small
              variant={confirm === g.id ? 'danger' : 'ghost'}
              title={confirm === g.id ? 'Точно распустить' : 'Распустить'}
              onPress={() => {
                if (confirm !== g.id) {
                  setConfirm(g.id);
                  return;
                }
                setConfirm(null);
                act(gmDisbandGuild(g.id), 'Распущена');
              }}
            />
          </View>
        </View>
      ))}
      <Button small variant="ghost" title="Открыть гильдии" onPress={() => router.push('/guild')} />
    </Card>
  );
}

function SaveCard({ act }: { act: Act }) {
  const gmResetSave = useGame((s) => s.gmResetSave);
  const [confirm, setConfirm] = useState(false);
  return (
    <Card title="Сейв">
      <Txt variant="small">Стирает персонажа, чат и гильдии. Служебный вход остаётся открытым.</Txt>
      <Button
        variant={confirm ? 'danger' : 'secondary'}
        title={confirm ? 'Точно стереть всё' : 'Стереть сейв'}
        onPress={() => {
          if (!confirm) {
            setConfirm(true);
            return;
          }
          act(gmResetSave(), 'Стёрто');
          router.replace('/');
        }}
      />
      {confirm ? <Button small variant="ghost" title="Передумал" onPress={() => setConfirm(false)} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  guild: { gap: spacing.xs, paddingVertical: spacing.xs },
});
