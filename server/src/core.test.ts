import { describe, expect, it } from 'vitest';
import { GUILD_FOUND_COST, GUILD_MIN_LEVEL, guildLevelCost } from '@/game/guild';
import type { Push } from '@/net/protocol';
import { GameCore, type Outgoing } from './core';
import { memoryStore } from './store';

// Ядро без сети: вход, роли, чат, модерация, гильдии.

function setup(opts: { adminSecret?: string } = {}) {
  let now = 1_000_000;
  const pushes: Outgoing[] = [];
  const store = memoryStore();
  const core = new GameCore(store, { adminSecret: opts.adminSecret, now: () => now, onPush: (o) => pushes.push(o) });
  const login = (token: string, name: string, extra: { level?: number; rating?: number; adminSecret?: string } = {}) => {
    const r = core.hello({ token, name, ...extra });
    if (!r.ok) throw new Error(r.reason);
    return r.result;
  };
  const events = (event: Push['event']) => pushes.filter((p) => p.push.event === event);
  return { core, store, pushes, login, events, tick: (ms: number) => (now += ms), now: () => now };
}

const ok = <T>(r: { ok: boolean; reason?: string; result?: T }): T => {
  if (!r.ok) throw new Error(`ожидали ok, получили: ${r.reason}`);
  return r.result as T;
};
const bad = (r: { ok: boolean; reason?: string }): string => {
  if (r.ok) throw new Error('ожидали отказ, получили ok');
  return r.reason!;
};

describe('вход', () => {
  it('создаёт пользователя по токену и узнаёт его при повторном входе', () => {
    const { core, login } = setup();
    const a = login('token-aaaaaaaa', 'Толян');
    expect(a.role).toBe('player');
    const again = login('token-aaaaaaaa', 'Толян', { level: 4 });
    expect(again.id).toBe(a.id);
    expect(core.state.users).toHaveLength(1);
    expect(core.state.users[0].level).toBe(4);
    expect(core.state.users[0].tokenHash).not.toContain('token-');
  });

  it('не пускает с чужим именем и с коротким токеном', () => {
    const { core, login } = setup();
    login('token-aaaaaaaa', 'Толян');
    expect(bad(core.hello({ token: 'token-bbbbbbbb', name: 'толян' }))).toBe('Имя занято');
    expect(bad(core.hello({ token: 'short', name: 'Вася' }))).toMatch(/токена/);
    expect(bad(core.hello({ token: 'token-cccccccc', name: 'В' }))).toMatch(/Имя от/);
  });

  it('переименование меняет имя и в гильдии', () => {
    const { core, login } = setup();
    const a = login('token-aaaaaaaa', 'Толян', { level: 5 });
    ok(core.found(a.id, { name: 'Псы', tag: 'ПСЫ', emblem: 'wolf' }));
    login('token-aaaaaaaa', 'Толя Большой');
    expect(core.state.guilds[0].members[0].name).toBe('Толя Большой');
  });

  it('первый с секретом — админ, второй — нет, без секрета — игрок', () => {
    const { login } = setup({ adminSecret: 'ключник' });
    expect(login('token-aaaaaaaa', 'Серёга', { adminSecret: 'ключник' }).role).toBe('admin');
    expect(login('token-bbbbbbbb', 'Вася', { adminSecret: 'ключник' }).role).toBe('player');
    expect(login('token-cccccccc', 'Петя').role).toBe('player');
  });

  it('без ADMIN_SECRET на сервере секрет не работает', () => {
    const { login } = setup();
    expect(login('token-aaaaaaaa', 'Серёга', { adminSecret: 'что угодно' }).role).toBe('player');
  });
});

describe('роли', () => {
  it('админ раздаёт роли, игрок — нет, пользователь получает событие me', () => {
    const { core, login, events } = setup({ adminSecret: 's' });
    const adm = login('token-aaaaaaaa', 'Серёга', { adminSecret: 's' });
    const u = login('token-bbbbbbbb', 'Вася');
    expect(bad(core.assignRole(u.id, adm.id, 'player'))).toBe('Нет прав');
    ok(core.assignRole(adm.id, u.id, 'moderator'));
    expect(ok(core.whoAmI(u.id)).role).toBe('moderator');
    expect(bad(core.assignRole(adm.id, u.id, 'moderator'))).toBe('Уже');
    expect(bad(core.assignRole(adm.id, u.id, 'king' as never))).toBe('Такой роли нет');
    expect(events('me')).toHaveLength(1);
  });
});

describe('чат', () => {
  it('сообщение уходит всем, история отдаёт его, чужой текст чистится', () => {
    const { core, login, events } = setup();
    const a = login('token-aaaaaaaa', 'Толян');
    ok(core.send(a.id, 'tavern', '  Здарова   всем  '));
    const hist = ok(core.history(a.id, 'tavern'));
    expect(hist).toHaveLength(1);
    expect(hist[0].text).toBe('Здарова всем');
    expect(hist[0].author).toEqual({ id: a.id, name: 'Толян', tag: null });
    expect(hist[0].kind).toBe('player');
    expect(events('chat.message')[0].to).toEqual({ all: true });
    expect(bad(core.send(a.id, 'tavern', '   '))).toBe('Пусто');
    expect(bad(core.send(a.id, 'cellar' as never, 'эй'))).toBe('Такого канала нет');
  });

  it('канал гильдии слышат только свои', () => {
    const { core, login, events } = setup();
    const a = login('token-aaaaaaaa', 'Толян', { level: 5 });
    const b = login('token-bbbbbbbb', 'Вася', { level: 5 });
    expect(bad(core.send(a.id, 'guild', 'эй'))).toBe('Ты не в гильдии');
    const g = ok(core.found(a.id, { name: 'Псы', tag: 'ПСЫ', emblem: 'wolf' }));
    ok(core.send(a.id, 'guild', 'свои тут?'));
    expect(ok(core.history(a.id, 'guild')).map((m) => m.text)).toContain('свои тут?');
    expect(ok(core.history(b.id, 'guild'))).toEqual([]);
    const guildPushes = events('chat.message').filter((p) => 'guild' in p.to);
    expect(guildPushes.every((p) => (p.to as { guild: string }).guild === g.id)).toBe(true);
    expect(core.publicHistory('guild')).toEqual([]);
  });

  it('лента стола не длиннее лимита', () => {
    const { core, login } = setup();
    const a = login('token-aaaaaaaa', 'Толян');
    for (let i = 0; i < 230; i++) ok(core.send(a.id, 'tavern', `сообщение ${i}`));
    ok(core.send(a.id, 'arena', 'арена живёт'));
    expect(core.state.messages.filter((m) => m.channel === 'tavern')).toHaveLength(200);
    expect(core.state.messages.filter((m) => m.channel === 'arena')).toHaveLength(1);
    expect(ok(core.history(a.id, 'tavern', 10))).toHaveLength(10);
  });

  it('у смотрящего метка роли и kind=staff', () => {
    const { core, login } = setup({ adminSecret: 's' });
    const adm = login('token-aaaaaaaa', 'Серёга', { adminSecret: 's' });
    ok(core.send(adm.id, 'tavern', 'порядок будет'));
    const m = ok(core.history(adm.id, 'tavern'))[0];
    expect(m.kind).toBe('staff');
    expect(m.author.role).toBe('admin');
  });
});

describe('модерация', () => {
  it('удаление: игроки не видят, смотрящий видит зачёркнутым, игрок удалить не может', () => {
    const { core, login, events } = setup({ adminSecret: 's' });
    const adm = login('token-aaaaaaaa', 'Серёга', { adminSecret: 's' });
    const u = login('token-bbbbbbbb', 'Вася');
    ok(core.send(u.id, 'tavern', 'гадость'));
    const id = ok(core.history(u.id, 'tavern'))[0].id;
    expect(bad(core.remove(u.id, id))).toBe('Нет прав');
    ok(core.remove(adm.id, id));
    expect(bad(core.remove(adm.id, id))).toBe('Уже удалено');
    expect(bad(core.remove(adm.id, 'm_nope'))).toBe('Сообщения нет');
    expect(ok(core.history(u.id, 'tavern'))).toEqual([]);
    expect(ok(core.history(adm.id, 'tavern'))[0].deleted).toBe(true);
    const last = events('chat.message').at(-1)!.push.data as { deleted?: boolean };
    expect(last.deleted).toBe(true);
  });

  it('заткнуть на N минут: молчит, потом говорит; 0 — вернуть голос', () => {
    const { core, login, tick } = setup({ adminSecret: 's' });
    const adm = login('token-aaaaaaaa', 'Серёга', { adminSecret: 's' });
    const u = login('token-bbbbbbbb', 'Вася');
    expect(bad(core.mute(u.id, adm.id, 5))).toBe('Нет прав');
    expect(bad(core.mute(adm.id, adm.id, 5))).toBe('Себя не заткнёшь');
    ok(core.mute(adm.id, u.id, 5));
    expect(bad(core.send(u.id, 'tavern', 'а?'))).toMatch(/заткнули ещё на 5 мин/);
    tick(3 * 60_000);
    expect(bad(core.send(u.id, 'tavern', 'а?'))).toMatch(/на 2 мин/);
    tick(3 * 60_000);
    ok(core.send(u.id, 'tavern', 'отпустило'));
    ok(core.mute(adm.id, u.id, 60));
    ok(core.mute(adm.id, u.id, 0));
    expect(bad(core.mute(adm.id, u.id, 0))).toBe('Он и не молчал');
    ok(core.send(u.id, 'tavern', 'свободен'));
    // В пивной остались слова мира об этом.
    expect(ok(core.history(u.id, 'tavern')).filter((m) => m.kind === 'system').length).toBeGreaterThanOrEqual(2);
  });

  it('смотрящий не затыкает мастера и равного себе', () => {
    const { core, login } = setup({ adminSecret: 's' });
    const adm = login('token-aaaaaaaa', 'Серёга', { adminSecret: 's' });
    const mod = login('token-bbbbbbbb', 'Фома');
    const mod2 = login('token-cccccccc', 'Гришка');
    ok(core.assignRole(adm.id, mod.id, 'moderator'));
    ok(core.assignRole(adm.id, mod2.id, 'moderator'));
    expect(bad(core.mute(mod.id, adm.id, 5))).toBe('Он тебе не по чину');
    expect(bad(core.mute(mod.id, mod2.id, 5))).toBe('Он тебе не по чину');
    ok(core.mute(adm.id, mod.id, 5));
  });

  it('слово мира: только с правом chat.broadcast, в гильдию — только свою', () => {
    const { core, login } = setup({ adminSecret: 's' });
    const adm = login('token-aaaaaaaa', 'Серёга', { adminSecret: 's' });
    const mod = login('token-bbbbbbbb', 'Фома');
    ok(core.assignRole(adm.id, mod.id, 'moderator'));
    expect(bad(core.broadcast(mod.id, 'tavern', 'тихо!'))).toBe('Нет прав');
    ok(core.broadcast(adm.id, 'arena', 'Турнир в полдень.'));
    const m = ok(core.history(mod.id, 'arena'))[0];
    expect(m.kind).toBe('system');
    expect(m.author.id).toBe('world');
    expect(bad(core.broadcast(adm.id, 'guild', 'эй'))).toMatch(/не в гильдии/);
  });
});

describe('гильдии', () => {
  it('основать: уровень, имя, тег, герб; основатель — глава без флага player', () => {
    const { core, login, events } = setup();
    const low = login('token-aaaaaaaa', 'Малой', { level: GUILD_MIN_LEVEL - 1 });
    expect(bad(core.found(low.id, { name: 'Псы', tag: 'ПСЫ', emblem: 'wolf' }))).toBe(`С ${GUILD_MIN_LEVEL} уровня`);
    const a = login('token-bbbbbbbb', 'Толян', { level: 5 });
    expect(bad(core.found(a.id, { name: 'Пс', tag: 'ПСЫ', emblem: 'wolf' }))).toMatch(/Название от/);
    expect(bad(core.found(a.id, { name: 'Псы', tag: 'П', emblem: 'wolf' }))).toMatch(/Тег/);
    expect(bad(core.found(a.id, { name: 'Псы', tag: 'ПСЫ', emblem: 'unicorn' }))).toBe('Такого герба нет');
    const g = ok(core.found(a.id, { name: 'Чёрные Псы', tag: 'псы', emblem: 'wolf', motto: 'Кто не с нами — тот корм.' }));
    expect(g.tag).toBe('ПСЫ');
    expect(g.members).toEqual([expect.objectContaining({ id: a.id, rank: 'leader', level: 5 })]);
    expect('player' in g.members[0]).toBe(false);
    expect(ok(core.mine(a.id))?.id).toBe(g.id);
    expect(bad(core.found(a.id, { name: 'Ещё', tag: 'ЕЩЕ', emblem: 'boar' }))).toBe('Ты уже в гильдии');
    const b = login('token-cccccccc', 'Вася', { level: 5 });
    expect(bad(core.found(b.id, { name: 'чёрные псы', tag: 'ВАС', emblem: 'boar' }))).toBe('Такая гильдия уже есть');
    expect(bad(core.found(b.id, { name: 'Васины', tag: 'ПСЫ', emblem: 'boar' }))).toBe('Тег занят');
    expect(events('guild.ladder')).toHaveLength(1);
    expect(ok(core.history(a.id, 'tavern')).some((m) => m.text.includes('новая гильдия'))).toBe(true);
    expect(GUILD_FOUND_COST).toBeGreaterThan(0); // цену списывает телефон, сервер кошелька не знает
  });

  it('заявка → приём десятником → ранги → выгнать → уйти', () => {
    const { core, login, events } = setup();
    const lead = login('token-aaaaaaaa', 'Толян', { level: 5 });
    const g = ok(core.found(lead.id, { name: 'Псы', tag: 'ПСЫ', emblem: 'wolf' }));
    const b = login('token-bbbbbbbb', 'Вася', { level: 3, rating: 50 });
    const c = login('token-cccccccc', 'Петя', { level: 0, rating: 0 });
    expect(bad(core.apply(c.id, g.id))).toMatch(/Берут с 1 уровня/);
    ok(core.apply(b.id, g.id));
    expect(bad(core.apply(b.id, g.id))).toMatch(/уже просился/);
    expect(bad(core.applications(b.id))).toBe('Ты не в гильдии');
    expect(ok(core.applications(lead.id)).map((u) => u.id)).toEqual([b.id]);
    expect(bad(core.invite(b.id, c.id))).toBe('Ты не в гильдии');
    ok(core.invite(lead.id, b.id));
    expect(ok(core.applications(lead.id))).toEqual([]);
    expect(ok(core.mine(b.id))?.members.map((m) => m.id)).toEqual([lead.id, b.id]);
    expect(bad(core.invite(lead.id, b.id))).toBe('Он уже в гильдии');
    // Боец звать не может, десятник — может.
    expect(bad(core.invite(b.id, c.id))).toBe('Зовут глава и десятники');
    expect(bad(core.setRank(b.id, b.id, 'officer'))).toBe('Ранги раздаёт глава');
    ok(core.setRank(lead.id, b.id, 'officer'));
    expect(bad(core.setRank(lead.id, b.id, 'leader'))).toBe('Главу не назначают, глава основал');
    expect(bad(core.setRank(lead.id, lead.id, 'member'))).toBe('Глава один');
    login('token-cccccccc', 'Петя', { level: 2 });
    ok(core.invite(b.id, c.id));
    // Десятник не выгоняет десятника, боец вообще никого, главу не выгоняют.
    ok(core.setRank(lead.id, c.id, 'officer'));
    expect(bad(core.kick(b.id, c.id))).toBe('Десятника выгоняет глава');
    expect(bad(core.kick(b.id, b.id))).toBe('Себя не выгонишь');
    expect(bad(core.kick(b.id, lead.id))).toBe('Десятника выгоняет глава'.length ? 'Главу не выгоняют' : '');
    ok(core.kick(lead.id, c.id));
    expect(ok(core.mine(c.id))).toBeNull();
    expect(events('guild.updated').at(-1)).toEqual({ push: { event: 'guild.updated', data: null }, to: { users: [c.id] } });
    expect(bad(core.leave(lead.id))).toBe('Глава не уходит. Распусти гильдию.');
    ok(core.leave(b.id));
    expect(ok(core.mine(b.id))).toBeNull();
    expect(ok(core.mine(lead.id))?.members).toHaveLength(1);
    expect(ok(core.mine(lead.id))?.log.map((e) => e.text)).toContain('Вася ушёл.');
  });

  it('мест в гильдии первого уровня пять', () => {
    const { core, login } = setup();
    const lead = login('token-aaaaaaaa', 'Толян', { level: 5 });
    ok(core.found(lead.id, { name: 'Псы', tag: 'ПСЫ', emblem: 'wolf' }));
    for (let i = 0; i < 4; i++) ok(core.invite(lead.id, login(`token-${i}xxxxxxx`, `Боец ${i}`).id));
    expect(bad(core.invite(lead.id, login('token-9xxxxxxx', 'Лишний').id))).toMatch(/Мест нет/);
  });

  it('казна и уровень: взнос, цена уровня, только глава', () => {
    const { core, login, events } = setup();
    const lead = login('token-aaaaaaaa', 'Толян', { level: 5 });
    const g = ok(core.found(lead.id, { name: 'Псы', tag: 'ПСЫ', emblem: 'wolf' }));
    const b = login('token-bbbbbbbb', 'Вася', { level: 3 });
    ok(core.invite(lead.id, b.id));
    expect(bad(core.donate(b.id, 0))).toBe('Сколько-сколько?');
    expect(bad(core.donate(b.id, -5))).toBe('Сколько-сколько?');
    ok(core.donate(b.id, 150.7));
    expect(ok(core.mine(b.id))?.treasury).toBe(150);
    expect(bad(core.upgrade(b.id))).toBe('Уровень поднимает глава');
    expect(bad(core.upgrade(lead.id))).toMatch(/В казне нужно 400/);
    ok(core.donate(lead.id, 300));
    ok(core.upgrade(lead.id));
    const after = ok(core.mine(lead.id))!;
    expect(after.level).toBe(2);
    expect(after.treasury).toBe(450 - guildLevelCost(1));
    expect(events('guild.ladder').length).toBeGreaterThanOrEqual(2);
    expect(core.ladder()[0].id).toBe(g.id);
  });

  it('распустить: только глава, все выходят, лента гильдии стирается', () => {
    const { core, login, events } = setup();
    const lead = login('token-aaaaaaaa', 'Толян', { level: 5 });
    const g = ok(core.found(lead.id, { name: 'Псы', tag: 'ПСЫ', emblem: 'wolf' }));
    const b = login('token-bbbbbbbb', 'Вася', { level: 3 });
    ok(core.invite(lead.id, b.id));
    ok(core.send(b.id, 'guild', 'тайна'));
    expect(bad(core.disband(b.id))).toBe('Распускает только глава');
    ok(core.disband(lead.id));
    expect(ok(core.mine(lead.id))).toBeNull();
    expect(ok(core.mine(b.id))).toBeNull();
    expect(core.state.guilds).toEqual([]);
    expect(core.state.messages.some((m) => m.text === 'тайна')).toBe(false);
    expect(events('guild.updated').at(-1)!.to).toEqual({ users: [lead.id, b.id] });
    expect(ok(core.history(b.id, 'tavern')).at(-1)!.text).toMatch(/распущена/);
    expect(bad(core.apply(b.id, g.id))).toBe('Такой гильдии нет');
  });

  it('мастер правит и распускает любую гильдию, игрок — нет', () => {
    const { core, login } = setup({ adminSecret: 's' });
    const adm = login('token-aaaaaaaa', 'Серёга', { adminSecret: 's' });
    const lead = login('token-bbbbbbbb', 'Толян', { level: 5 });
    const g = ok(core.found(lead.id, { name: 'Псы', tag: 'ПСЫ', emblem: 'wolf' }));
    const other = login('token-cccccccc', 'Вася', { level: 5 });
    ok(core.found(other.id, { name: 'Коты', tag: 'КОТ', emblem: 'raven' }));
    expect(bad(core.edit(lead.id, g.id, { level: 5 }))).toBe('Нет прав');
    expect(bad(core.edit(adm.id, 'g_nope', { level: 5 }))).toBe('Такой гильдии нет');
    expect(bad(core.edit(adm.id, g.id, { tag: 'КОТ' }))).toBe('Тег занят');
    ok(core.edit(adm.id, g.id, { level: 99, treasury: -5, rating: 120, motto: '  Корм.  ', name: 'Чёрные Псы' }));
    const after = ok(core.mine(lead.id))!;
    expect(after.level).toBe(5);
    expect(after.treasury).toBe(0);
    expect(after.rating).toBe(120);
    expect(after.motto).toBe('Корм.');
    expect(after.name).toBe('Чёрные Псы');
    expect(after.log.at(-1)!.text).toMatch(/Мастер/);
    expect(core.ladder()[0].id).toBe(g.id);
    expect(bad(core.disbandAny(lead.id, g.id))).toBe('Нет прав');
    ok(core.disbandAny(adm.id, g.id));
    expect(ok(core.mine(lead.id))).toBeNull();
  });
});
