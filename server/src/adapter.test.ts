import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import type { ChatMessage } from '@/game/chat';
import type { Push } from '@/net/protocol';
import { ServerBackend, toWsUrl, type WebSocketLike } from '@/net/serverBackend';
import { createGameServer } from './server';
import { memoryStore } from './store';

// Клиентский адаптер (`combat/src/net/serverBackend.ts`) против настоящего сервера.
// Сокет — пакет ws: у него тот же интерфейс, что у WebSocket в браузере и React Native.

const socket = (url: string) => new WebSocket(url) as unknown as WebSocketLike;

describe('адаптер GameBackend поверх WebSocket', () => {
  const cleanup: (() => Promise<void> | void)[] = [];
  afterEach(async () => {
    while (cleanup.length) await cleanup.pop()!();
  });

  async function start() {
    const server = createGameServer({ store: memoryStore(), adminSecret: 'слово', log: () => {} });
    await new Promise<void>((resolve) => server.http.listen(0, '127.0.0.1', () => resolve()));
    cleanup.push(() => server.close());
    const port = (server.http.address() as { port: number }).port;
    const client = (name: string, level = 5, adminSecret?: string) => {
      const b = new ServerBackend({ url: `http://127.0.0.1:${port}`, token: async () => `token-${name}-xxxxxxxx`, identity: () => ({ name, level, rating: 100 }), adminSecret, socket, timeoutMs: 2_000 });
      cleanup.push(() => b.close());
      return b;
    };
    return { server, client };
  }

  it('переводит http в ws', () => {
    expect(toWsUrl('http://a:1/')).toBe('ws://a:1');
    expect(toWsUrl('https://a')).toBe('wss://a');
    expect(toWsUrl('ws://a:1')).toBe('ws://a:1');
  });

  it('вход при первом вызове, чат с подпиской, гильдия с флагом player у себя, права', async () => {
    const { client } = await start();
    const serega = client('Серёга', 5, 'слово');
    const vasya = client('Вася', 3);

    expect(await serega.auth.whoAmI()).toMatchObject({ name: 'Серёга', role: 'admin' });
    expect(serega.connection).toBe('online');

    const got: ChatMessage[] = [];
    const unsub = vasya.chat.subscribe('tavern', (m) => got.push(m));
    expect(await vasya.auth.whoAmI()).toMatchObject({ name: 'Вася', role: 'player' });
    expect(await serega.chat.send('tavern', 'Всем здарова')).toEqual({ ok: true });
    await until(() => got.length === 1);
    expect(got[0]).toMatchObject({ text: 'Всем здарова', author: { name: 'Серёга', role: 'admin' } });
    expect((await vasya.chat.history('tavern')).map((m) => m.text)).toEqual(['Всем здарова']);

    // Модерация: игрок не может, админ может; удалённое прилетает подписчику с флагом.
    expect(await vasya.chat.remove(got[0].id)).toEqual({ ok: false, reason: 'Нет прав' });
    expect(await serega.chat.remove(got[0].id)).toEqual({ ok: true });
    await until(() => got.length === 2);
    expect(got[1].deleted).toBe(true);
    unsub();

    // Гильдия: Серёга основал, Вася просится, Серёга принимает; у каждого в составе отмечен он сам.
    const pushes: Push[] = [];
    vasya.onPush((p) => pushes.push(p));
    expect(await serega.guilds.found({ name: 'Псы', tag: 'ПСЫ', emblem: 'wolf', motto: 'Корм.' })).toEqual({ ok: true });
    const ladder = await vasya.guilds.list();
    expect(ladder).toHaveLength(1);
    expect(ladder[0].members[0].player).toBeUndefined();
    expect(await vasya.guilds.apply(ladder[0].id)).toEqual({ ok: true });
    const apps = await serega.guilds.applications();
    expect(apps.map((u) => u.name)).toEqual(['Вася']);
    expect(await serega.guilds.invite(apps[0].id)).toEqual({ ok: true });
    await until(() => pushes.some((p) => p.event === 'guild.updated'));
    const mine = await vasya.guilds.mine();
    expect(mine?.members.map((m) => [m.name, m.player ?? false])).toEqual([['Серёга', false], ['Вася', true]]);
    expect((await serega.guilds.mine())?.members.find((m) => m.player)?.name).toBe('Серёга');
    expect(await vasya.chat.send('guild', 'свои')).toEqual({ ok: true });
    expect((await serega.chat.history('guild')).at(-1)?.text).toBe('свои');
    expect(await vasya.guilds.upgrade()).toEqual({ ok: false, reason: 'Уровень поднимает глава' });
    expect(await serega.guilds.edit(ladder[0].id, { rating: 50 })).toEqual({ ok: true });
    expect((await serega.guilds.list())[0].rating).toBe(50);

    // Роли: админ выдал смотрящего, Вася узнаёт об этом событием и может затыкать.
    const vasyaId = (await vasya.auth.whoAmI()).id;
    expect(await serega.auth.assignRole(vasyaId, 'moderator')).toEqual({ ok: true });
    await until(() => vasya.self?.role === 'moderator');
    expect(await vasya.auth.whoAmI()).toMatchObject({ role: 'moderator' });
    const users = await vasya.users();
    expect(users.map((u) => u.name).sort()).toEqual(['Вася', 'Серёга']);
  });

  it('без персонажа входа нет; после обрыва связи переподключается', async () => {
    const { server, client } = await start();
    let name = '';
    const b = new ServerBackend({ url: `ws://127.0.0.1:${(server.http.address() as { port: number }).port}`, token: async () => 'token-zzzzzzzz', identity: () => ({ name }), socket, timeoutMs: 1_000 });
    cleanup.push(() => b.close());
    expect(await b.chat.send('tavern', 'эй')).toEqual({ ok: false, reason: 'Сначала создай персонажа' });
    await expect(b.chat.history('tavern')).rejects.toThrow('Сначала создай персонажа');
    name = 'Петя';
    expect(await b.chat.send('tavern', 'эй')).toEqual({ ok: true });

    const statuses: string[] = [];
    b.onStatus((s) => statuses.push(s));
    // Связь оборвалась: адаптер замечает и поднимает новую при следующем запросе.
    (b as unknown as { ws: { close(): void } }).ws.close();
    await until(() => statuses.includes('offline'));
    expect(await b.chat.send('tavern', 'я вернулся')).toEqual({ ok: true });
    expect(statuses.at(-1)).toBe('online');
    const other = client('Фома');
    expect((await other.chat.history('tavern')).map((m) => m.text)).toEqual(['эй', 'я вернулся']);
  });
});

async function until(cond: () => boolean, ms = 2_000) {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error('не дождались');
    await new Promise((r) => setTimeout(r, 10));
  }
}
