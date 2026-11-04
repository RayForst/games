import { describe, expect, it } from 'vitest';

import {
  ambientLine,
  appendMessage,
  CHAT_LIMIT,
  cleanText,
  deliverPending,
  emptyChat,
  fightNews,
  matchTopic,
  normalizeChat,
  npcReplies,
  unreadCount,
  validateMessage,
  visibleMessages,
  type ChatMessage,
} from './chat';

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

const msg = (id: string, at: number, channel: ChatMessage['channel'] = 'tavern', extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  channel,
  at,
  author: { id: 'p', name: 'Я' },
  text: id,
  kind: 'player',
  ...extra,
});

describe('chat', () => {
  it('чистит текст и не пускает пустое', () => {
    expect(cleanText('  привет   всем \n')).toBe('привет всем');
    expect(validateMessage('   ').ok).toBe(false);
    expect(validateMessage('эй').ok).toBe(true);
    expect(cleanText('x'.repeat(1000))).toHaveLength(240);
  });

  it('лента не длиннее лимита', () => {
    let s = emptyChat(0);
    for (let i = 0; i < CHAT_LIMIT + 10; i += 1) s = appendMessage(s, msg(`m${i}`, i));
    expect(s.messages).toHaveLength(CHAT_LIMIT);
    expect(s.messages[0].id).toBe('m10');
  });

  it('удалённое видят только смотрящие', () => {
    let s = emptyChat(0);
    s = appendMessage(s, msg('a', 1));
    s = appendMessage(s, msg('b', 2, 'tavern', { deleted: true }));
    s = appendMessage(s, msg('c', 3, 'arena'));
    expect(visibleMessages(s, 'tavern').map((m) => m.id)).toEqual(['a']);
    expect(visibleMessages(s, 'tavern', true).map((m) => m.id)).toEqual(['a', 'b']);
    expect(unreadCount(s, 0)).toBe(2);
    expect(unreadCount(s, 1, 'arena')).toBe(1);
  });

  it('тема по ключевым словам, приоритет у служебных и ругани', () => {
    expect(matchTopic('Привет всем!')).toBe('greet');
    expect(matchTopic('кто хочет драку на арене')).toBe('fight');
    expect(matchTopic('где взять кредиты')).toBe('money');
    expect(matchTopic('Создаю гильдию, кто со мной')).toBe('guild');
    expect(matchTopic('а в броде как платят')).toBe('brod');
    expect(matchTopic('привет, ты дурак')).toBe('insult');
    expect(matchTopic('есть тут ГМ?')).toBe('staff');
    expect(matchTopic('ыыыы')).toBe('default');
  });

  it('на слова игрока отвечает тот, кто знает тему, с задержкой', () => {
    const rng = seq([0.1, 0.5, 0.9]);
    const replies = npcReplies('привет', 'tavern', rng, 1000);
    expect(replies.length).toBeGreaterThanOrEqual(1);
    expect(replies[0].at).toBeGreaterThan(1000);
    expect(replies[0].author.id.startsWith('npc:')).toBe(true);
    // В гильдейском канале слышат только свои: без голосов — тишина.
    expect(npcReplies('привет', 'guild', rng, 1000, [])).toEqual([]);
    // Тема «гильдии»: отвечают только знающие.
    const r = npcReplies('гильдия', 'tavern', seq([0, 0, 0]), 0);
    expect(['tolyan', 'nyura', 'soldier', 'marfa', 'grishka', 'shadow'].some((id) => r[0].author.id === `npc:${id}`)).toBe(true);
  });

  it('доставляет созревшие ответы и оставляет остальные', () => {
    let s = emptyChat(0);
    s = { ...s, pending: [ambientLine(seq([0]), 10), { ...ambientLine(seq([0]), 50) }] };
    let n = 0;
    const next = deliverPending(s, 20, () => `id${n++}`);
    expect(next.messages).toHaveLength(1);
    expect(next.messages[0].kind).toBe('npc');
    expect(next.pending).toHaveLength(1);
    expect(deliverPending(next, 20, () => 'x')).toBe(next);
  });

  it('сводка боя склоняет ходы', () => {
    expect(fightNews('Я', 'Толян', 'won', 1, 'city')).toBe('Арена: Я уложил Толян за 1 ход.');
    expect(fightNews('Я', 'Толян', 'won', 3, 'brod')).toContain('3 хода.');
    expect(fightNews('Я', 'Толян', 'lost', 12, 'city')).toContain('12 ходов.');
    expect(fightNews('Я', 'Толян', 'draw', 5, 'tournament')).toContain('Замок');
  });

  it('нормализует кривой сейв', () => {
    const s = normalizeChat({ messages: undefined, muted: ['a'] } as never, 5);
    expect(s.messages).toEqual([]);
    expect(s.muted).toEqual(['a']);
    expect(s.nextAmbientAt).toBeGreaterThan(5);
  });
});
