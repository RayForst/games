import { visibleMessages, type ChatMessage } from '@/game/chat';
import { guildLadder, type Guild } from '@/game/guild';
import { can } from '@/game/roles';
import type { Check } from '@/game/character';
import { useGame } from '@/store/useGame';
import type { GameBackend } from './backend';

// Локальный бэкенд: тот же контракт `GameBackend`, но отвечает стор на телефоне, как и раньше.
// Экраны пока зовут стор напрямую; этот слой нужен, чтобы серверный и офлайн-режим были взаимозаменяемы.

const ok: Check = { ok: true };
const noCharacter: Check = { ok: false, reason: 'Сначала создай персонажа' };

export function createLocalBackend(store: typeof useGame = useGame): GameBackend {
  const s = () => store.getState();

  return {
    auth: {
      async whoAmI() {
        const { character, account } = s();
        return { id: 'player', name: character?.name ?? '', role: account.role };
      },
      async assignRole(userId, role) {
        if (userId !== 'player') return { ok: false, reason: 'Без сервера роль меняется только себе' };
        return s().setRole(role);
      },
    },

    chat: {
      async history(channel, limit = 50) {
        const { chat, account } = s();
        const all = visibleMessages(chat, channel, can(account.role, 'chat.moderate'));
        return all.slice(Math.max(0, all.length - limit));
      },
      async send(channel, text) {
        return s().character ? s().sendChat(channel, text) : noCharacter;
      },
      subscribe(channel, onMessage) {
        // Стор меняет массив целиком: сравниваем ссылки и отдаём новое и то, что стало удалённым.
        let seen = new Map<string, ChatMessage>(s().chat.messages.map((m) => [m.id, m]));
        return store.subscribe((state, prev) => {
          if (state.chat.messages === prev.chat.messages) return;
          const next = new Map<string, ChatMessage>();
          for (const m of state.chat.messages) {
            next.set(m.id, m);
            const old = seen.get(m.id);
            if (m.channel === channel && (!old || old.deleted !== m.deleted)) onMessage(m);
          }
          seen = next;
        });
      },
      async remove(messageId) {
        return s().deleteChatMessage(messageId);
      },
      async mute(userId, minutes) {
        return minutes > 0 ? s().muteAuthor(userId) : s().unmuteAuthor(userId);
      },
      async broadcast(channel, text) {
        return s().gmBroadcast(channel, text);
      },
    },

    guilds: {
      async list() {
        const { guild, npcGuilds } = s();
        return guildLadder(guild, npcGuilds);
      },
      async mine() {
        return s().guild;
      },
      async found({ name, tag, emblem, motto }) {
        return s().foundGuild(name, tag, emblem, motto);
      },
      async apply(guildId) {
        return s().joinGuild(guildId);
      },
      async leave() {
        return s().leaveGuild();
      },
      async disband() {
        return s().disbandGuild();
      },
      async invite(userId) {
        // Без сервера позвать можно только именного соперника: id члена — `npc:<rivalId>`.
        const r = s().inviteRival(userId.replace(/^npc:/, ''));
        return r.ok ? ok : { ok: false, reason: r.reason };
      },
      async kick(userId) {
        return s().kickMember(userId);
      },
      async setRank(userId, rank) {
        return s().setMemberRank(userId, rank);
      },
      async donate(amount) {
        return s().donateGuild(amount);
      },
      async upgrade() {
        return s().upgradeGuild();
      },
      async edit(guildId, patch: Partial<Pick<Guild, 'name' | 'tag' | 'motto' | 'level' | 'treasury' | 'rating'>>) {
        return s().gmEditGuild(guildId, patch);
      },
    },
  };
}
