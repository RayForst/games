import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Flash } from '@/components/Flash';
import { Input } from '@/components/Input';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import { can, CHANNELS, CHANNELS_BY_ID, isMuted, MESSAGE_MAX, ROLE_TAGS, visibleMessages, type ChannelId, type ChatMessage } from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useGame } from '@/store/useGame';
import { playSfx } from '@/ui/sfx';
import { colors, radius, sideColors, spacing } from '@/ui/theme';

function hhmm(at: number): string {
  const d = new Date(at);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/** Чат: общий стол пивной, сводки арены и гильдейский канал. Собеседники пока местные — сервера нет. */
export default function ChatScreen() {
  const character = useGame((s) => s.character);
  const chat = useGame((s) => s.chat);
  const guild = useGame((s) => s.guild);
  const role = useGame((s) => s.account.role);
  const sendChat = useGame((s) => s.sendChat);
  const markChatSeen = useGame((s) => s.markChatSeen);
  const deleteChatMessage = useGame((s) => s.deleteChatMessage);
  const muteAuthor = useGame((s) => s.muteAuthor);
  const unmuteAuthor = useGame((s) => s.unmuteAuthor);
  const [channel, setChannel] = useState<ChannelId>('tavern');
  const [text, setText] = useState('');
  const [flash, show] = useFlash();
  const scroll = useRef<ScrollView>(null);

  const moderator = can(role, 'chat.moderate');
  const messages = visibleMessages(chat, channel, moderator);
  const count = messages.length;
  const lastId = messages[count - 1]?.id;

  // Новое сообщение — лента вниз, непрочитанное сброшено.
  useEffect(() => {
    markChatSeen();
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [lastId, channel, markChatSeen]);

  if (!character) return null;

  const muted = isMuted(chat, 'player');

  const send = () => {
    const r = sendChat(channel, text);
    if (!r.ok) {
      show(r.reason ?? 'Не отправилось');
      return;
    }
    playSfx('message');
    setText('');
  };

  const pickChannel = (id: ChannelId) => {
    if (id === 'guild' && !guild) {
      show('Гильдейский стол — для своих. Вступи или основай гильдию.');
      return;
    }
    setChannel(id);
  };

  const toggleMute = (authorId: string, name: string) => {
    const r = isMuted(chat, authorId) ? unmuteAuthor(authorId) : muteAuthor(authorId);
    show(r.ok ? (isMuted(chat, authorId) ? `${name} снова говорит` : `${name} заткнут`) : (r.reason ?? 'Не получилось'));
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <BackBar title="Назад" right={guild ? <Txt variant="small" color={colors.gold}>[{guild.tag}]</Txt> : null} />
        <View style={styles.channels}>
          {CHANNELS.map((ch) => (
            <Chip key={ch.id} label={ch.name} active={ch.id === channel} onPress={() => pickChannel(ch.id)} />
          ))}
        </View>
        <Txt variant="small">{CHANNELS_BY_ID[channel].hint}</Txt>
        <Flash text={flash} />

        <ScrollView ref={scroll} style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
          {count === 0 ? <Txt variant="small" center style={styles.empty}>{channel === 'arena' ? 'Сводок пока нет. Сходи подерись.' : 'Тихо. Скажи что-нибудь.'}</Txt> : null}
          {messages.map((m) => (
            <Message key={m.id} m={m} moderator={moderator} muted={isMuted(chat, m.author.id)} onDelete={() => deleteChatMessage(m.id)} onMute={() => toggleMute(m.author.id, m.author.name)} />
          ))}
          {moderator && chat.muted.length > 0 ? (
            <Txt variant="small" center>
              Молчат: {chat.muted.join(', ')}
            </Txt>
          ) : null}
        </ScrollView>

        {muted ? (
          <Txt variant="small" center color={colors.red} style={styles.mutedNote}>
            Тебя заткнул смотрящий. Читать можно, писать — нет.
          </Txt>
        ) : (
          <View style={styles.inputRow}>
            <Input
              value={text}
              onChangeText={setText}
              placeholder={channel === 'guild' ? 'Своим…' : 'Скажи…'}
              maxLength={MESSAGE_MAX}
              returnKeyType="send"
              onSubmitEditing={send}
              blurOnSubmit={false}
              style={styles.flex}
            />
            <Button small title="Сказать" onPress={send} disabled={text.trim().length === 0} />
          </View>
        )}
        <Pressable onPress={() => router.push('/guild')} accessibilityRole="button" accessibilityLabel="Гильдии">
          <Txt variant="small" center color={colors.textDim}>
            Собеседники — местные: сервера пока нет. Гильдии — в задней комнате пивной.
          </Txt>
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Message({ m, moderator, muted, onDelete, onMute }: { m: ChatMessage; moderator: boolean; muted: boolean; onDelete: () => void; onMute: () => void }) {
  if (m.kind === 'system') {
    return (
      <View style={styles.system}>
        <Txt variant="small" center color={colors.textMuted}>
          {m.text}
        </Txt>
      </View>
    );
  }
  const mine = m.author.id === 'player';
  const tag = m.author.role ? ROLE_TAGS[m.author.role] : null;
  return (
    <View style={[styles.msg, mine && styles.mine, m.deleted && styles.deleted]}>
      <View style={styles.msgHead}>
        <Pressable onPress={moderator && !mine ? onMute : undefined} accessibilityRole={moderator && !mine ? 'button' : undefined} accessibilityLabel={moderator && !mine ? `Заткнуть: ${m.author.name}` : undefined}>
          <Txt variant="small" bold color={m.kind === 'staff' ? colors.red : mine ? colors.gold : colors.text}>
            {m.author.side ? (
              <Txt variant="small" bold color={sideColors[m.author.side]}>
                {'● '}
              </Txt>
            ) : null}
            {tag ? `[${tag}] ` : ''}
            {m.author.tag ? `[${m.author.tag}] ` : ''}
            {m.author.name}
            {muted ? ' · молчит' : ''}
          </Txt>
        </Pressable>
        <Txt variant="small" color={colors.textDim}>
          {hhmm(m.at)}
        </Txt>
        {moderator && !m.deleted ? (
          <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Удалить сообщение" hitSlop={8}>
            <Txt variant="small" color={colors.red}>
              ✕
            </Txt>
          </Pressable>
        ) : null}
      </View>
      <Txt style={m.deleted ? styles.strike : undefined}>{m.text}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  channels: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  list: { flex: 1, backgroundColor: colors.bgElevated, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  listContent: { padding: spacing.sm, gap: spacing.xs, flexGrow: 1, justifyContent: 'flex-end' },
  empty: { paddingVertical: spacing.xl },
  system: { paddingVertical: 2 },
  msg: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, gap: 2, borderWidth: 1, borderColor: colors.border, alignSelf: 'stretch' },
  mine: { borderColor: colors.goldDim },
  deleted: { opacity: 0.5 },
  strike: { textDecorationLine: 'line-through' },
  msgHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  mutedNote: { paddingVertical: spacing.sm },
});
