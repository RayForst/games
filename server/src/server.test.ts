import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import type { Request, ServerMessage } from '@/net/protocol';
import { createGameServer } from './server';
import { memoryStore } from './store';

// Сквозной прогон по WebSocket: вход, запрос без входа, рассылка сообщения второму клиенту, HTTP.

type Client = {
  ws: WebSocket;
  call: <T = unknown>(method: string, params?: unknown) => Promise<{ ok: true; result: T } | { ok: false; reason: string }>;
  pushes: ServerMessage[];
  nextPush: () => Promise<ServerMessage>;
  close: () => void;
};

async function connect(port: number): Promise<Client> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
  let id = 0;
  const waiting = new Map<number, (m: ServerMessage) => void>();
  const pushes: ServerMessage[] = [];
  const pushWaiters: ((m: ServerMessage) => void)[] = [];
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString()) as ServerMessage;
    if ('id' in m) {
      waiting.get(m.id)?.(m);
      waiting.delete(m.id);
    } else {
      pushes.push(m);
      pushWaiters.shift()?.(m);
    }
  });
  return {
    ws,
    pushes,
    call: (method, params = {}) =>
      new Promise((resolve) => {
        const req: Request = { id: ++id, method: method as Request['method'], params: params as never };
        waiting.set(req.id, (m) => resolve(m as never));
        ws.send(JSON.stringify(req));
      }),
    nextPush: () => (pushes.length ? Promise.resolve(pushes.shift()!) : new Promise((resolve) => pushWaiters.push(resolve))),
    close: () => ws.close(),
  };
}

describe('сервер по сети', () => {
  const servers: { close(): Promise<void> }[] = [];
  afterEach(async () => {
    while (servers.length) await servers.pop()!.close();
  });

  async function start() {
    const server = createGameServer({ store: memoryStore(), adminSecret: 'слово', log: () => {} });
    servers.push(server);
    await new Promise<void>((resolve) => server.http.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.http.address() as { port: number }).port;
    return { server, port };
  }

  it('без входа отказ; после входа — чат доходит до второго клиента; HTTP отдаёт здоровье и историю', async () => {
    const { port } = await start();
    const a = await connect(port);
    const b = await connect(port);
    expect(await a.call('chat.send', { channel: 'tavern', text: 'эй' })).toEqual({ id: 1, ok: false, reason: 'Сначала войди' });
    expect(await a.call('auth.hello', { token: 'token-aaaaaaaa', name: 'Толян', adminSecret: 'слово', version: 1 })).toMatchObject({ ok: true, result: { name: 'Толян', role: 'admin' } });
    expect(await b.call('auth.hello', { token: 'token-bbbbbbbb', name: 'Вася', version: 99 })).toMatchObject({ ok: false, reason: expect.stringContaining('Обнови игру') });
    expect(await b.call('auth.hello', { token: 'token-bbbbbbbb', name: 'Вася' })).toMatchObject({ ok: true, result: { role: 'player', guildId: null } });

    expect(await a.call('chat.send', { channel: 'tavern', text: 'Здарова' })).toEqual({ id: 3, ok: true, result: null });
    const push = await b.nextPush();
    expect(push).toMatchObject({ event: 'chat.message', data: { text: 'Здарова', author: { name: 'Толян', role: 'admin' } } });
    expect(await b.call('chat.history', { channel: 'tavern' })).toMatchObject({ ok: true, result: [{ text: 'Здарова' }] });
    expect(await b.call('nope.method', {})).toMatchObject({ ok: false, reason: 'Такого метода нет' });
    expect(await b.call('guilds.list')).toEqual({ id: 5, ok: true, result: [] });
    expect(await b.call('auth.users')).toMatchObject({ ok: true, result: [expect.objectContaining({ name: 'Вася', online: true }), expect.objectContaining({ name: 'Толян', online: true })] });

    const health = (await (await fetch(`http://127.0.0.1:${port}/health`)).json()) as { ok: boolean; users: number };
    expect(health).toMatchObject({ ok: true, users: 2 });
    const hist = (await (await fetch(`http://127.0.0.1:${port}/history/tavern?limit=5`)).json()) as { text: string }[];
    expect(hist.map((m) => m.text)).toEqual(['Здарова']);
    expect((await fetch(`http://127.0.0.1:${port}/history/guild`)).status).toBe(404);
    a.close();
    b.close();
  });

  it('события гильдии уходят только членам', async () => {
    const { port } = await start();
    const a = await connect(port);
    const b = await connect(port);
    const c = await connect(port);
    await a.call('auth.hello', { token: 'token-aaaaaaaa', name: 'Толян', level: 5 });
    const bMe = (await b.call<{ id: string }>('auth.hello', { token: 'token-bbbbbbbb', name: 'Вася', level: 3 })) as { ok: true; result: { id: string } };
    await c.call('auth.hello', { token: 'token-cccccccc', name: 'Петя' });
    expect(await a.call('guilds.found', { name: 'Псы', tag: 'ПСЫ', emblem: 'wolf' })).toMatchObject({ ok: true, result: { tag: 'ПСЫ' } });
    expect(await a.call('guilds.invite', { userId: bMe.result.id })).toMatchObject({ ok: true });
    expect(await b.call('chat.send', { channel: 'guild', text: 'свои' })).toMatchObject({ ok: true });
    expect(await a.call('chat.send', { channel: 'tavern', text: 'всем' })).toMatchObject({ ok: true });
    // Пока третий не получил «всем», все рассылки уже разошлись: порядок в одном сокете сохраняется.
    const seen: ServerMessage[] = [];
    for (;;) {
      const p = await c.nextPush();
      seen.push(p);
      if ('event' in p && p.event === 'chat.message' && p.data.text === 'всем') break;
    }
    const cSaw = seen.filter((p) => 'event' in p && p.event === 'chat.message').map((p) => (p as { data: { text: string } }).data.text);
    expect(cSaw).not.toContain('свои');
    expect(seen.some((p) => 'event' in p && p.event === 'guild.ladder')).toBe(true);
    expect(seen.some((p) => 'event' in p && p.event === 'guild.updated')).toBe(false);
    const bTexts = b.pushes.filter((p) => 'event' in p && p.event === 'chat.message').map((p) => (p as { data: { text: string } }).data.text);
    expect(bTexts).toContain('свои');
    expect(b.pushes.some((p) => 'event' in p && p.event === 'guild.updated')).toBe(true);
    a.close();
    b.close();
    c.close();
  });
});
