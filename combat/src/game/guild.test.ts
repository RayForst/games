import { describe, expect, it } from 'vitest';

import { newCharacter } from './character';
import {
  addMember,
  canFoundGuild,
  canRecruitRival,
  canUpgradeGuild,
  dailyContribution,
  dailyGuildUpdate,
  GUILD_FOUND_COST,
  guildLadder,
  guildLevelCost,
  guildPerks,
  guildRatingDelta,
  joinCheck,
  ladderPlace,
  newGuild,
  normalizeGuilds,
  NPC_GUILDS,
  removeMember,
  setRank,
  skirmishOpponent,
  skirmishPrize,
  taggedName,
  validateGuildName,
  validateGuildTag,
} from './guild';

const seq = (vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

const founder = { id: 'me', name: 'Я', level: 3 };
const mk = () => newGuild({ id: 'g1', name: 'Ночные Псы', tag: 'нпс', emblem: 'wolf', founder, now: 100 });

describe('guild', () => {
  it('проверяет название и тег', () => {
    expect(validateGuildName('Аб').ok).toBe(false);
    expect(validateGuildName('Чёрные Псы', ['чёрные псы']).ok).toBe(false);
    expect(validateGuildName('Ночные Псы').ok).toBe(true);
    expect(validateGuildName('Псы!!!').ok).toBe(false);
    expect(validateGuildTag('п').ok).toBe(false);
    expect(validateGuildTag('псы', ['ПСЫ']).ok).toBe(false);
    expect(validateGuildTag('нпс').ok).toBe(true);
    expect(validateGuildTag('п5').ok).toBe(false);
  });

  it('основание: уровень и кредиты, тег в верхнем регистре, глава — игрок', () => {
    const c = newCharacter('Я', { strength: 3, dexterity: 3, intuition: 3, endurance: 3 }, 0);
    expect(canFoundGuild(c).ok).toBe(false);
    const rich = { ...c, level: 3, kredits: GUILD_FOUND_COST };
    expect(canFoundGuild(rich).ok).toBe(true);
    const g = mk();
    expect(g.tag).toBe('НПС');
    expect(g.members[0]).toMatchObject({ id: 'me', rank: 'leader', player: true });
    expect(g.log).toHaveLength(1);
    expect(taggedName('Я', g.tag)).toBe('[НПС] Я');
  });

  it('состав: вступление, лимит мест, выгон, ранги', () => {
    let g = mk();
    const r = addMember(g, { id: 'npc:tolyan', name: 'Толян', level: 3 }, 200);
    expect(r.ok).toBe(true);
    g = r.guild;
    expect(addMember(g, { id: 'npc:tolyan', name: 'Толян', level: 3 }).ok).toBe(false);
    for (let i = 0; i < 10; i += 1) g = addMember(g, { id: `x${i}`, name: `Боец ${i}`, level: 1 }).guild;
    expect(g.members).toHaveLength(guildPerks(1).maxMembers);
    expect(removeMember(g, 'me', 'kick').ok).toBe(false);
    expect(removeMember(g, 'npc:tolyan', 'kick').guild.members.some((m) => m.id === 'npc:tolyan')).toBe(false);
    expect(setRank(g, 'me', 'officer').ok).toBe(false);
    expect(setRank(g, 'x0', 'leader').ok).toBe(false);
    const up = setRank(g, 'x0', 'officer');
    expect(up.ok).toBe(true);
    expect(up.guild.members.find((m) => m.id === 'x0')?.rank).toBe('officer');
  });

  it('уровень гильдии: цена из казны и бонусы', () => {
    expect(guildLevelCost(1)).toBe(400);
    expect(guildLevelCost(4)).toBe(2500);
    const g = mk();
    expect(canUpgradeGuild(g).ok).toBe(false);
    expect(canUpgradeGuild({ ...g, treasury: 400 }).ok).toBe(true);
    expect(canUpgradeGuild({ ...g, level: 5, treasury: 99999 }).ok).toBe(false);
    expect(guildPerks(5).expMult).toBe(1.1);
    expect(guildPerks(0).maxMembers).toBe(5);
  });

  it('вербовка именного соперника после двух побед', () => {
    const c = newCharacter('Я', { strength: 3, dexterity: 3, intuition: 3, endurance: 3 }, 0);
    expect(canRecruitRival(c, 'tolyan').ok).toBe(false);
    expect(canRecruitRival({ ...c, rivals: { tolyan: { wins: 2, losses: 5 } } }, 'tolyan').ok).toBe(true);
  });

  it('вступление к местным по уровню, рейтингу и местам', () => {
    const c = newCharacter('Я', { strength: 3, dexterity: 3, intuition: 3, endurance: 3 }, 0);
    const dogs = NPC_GUILDS[0];
    expect(joinCheck({ ...c, level: 1 }, dogs).ok).toBe(false);
    expect(joinCheck({ ...c, level: 2, rating: 10 }, dogs).ok).toBe(false);
    expect(joinCheck({ ...c, level: 2, rating: 40 }, dogs).ok).toBe(true);
  });

  it('стычка: соперник ближайшего уровня, приз растёт с уровнем гильдии', () => {
    const o = skirmishOpponent(NPC_GUILDS[1], 4, seq([0.2, 0.4, 0.6]));
    expect(['Жила'].includes(o.name)).toBe(true);
    expect(o.level).toBe(4);
    expect(o.id.startsWith('guild:guildhall:')).toBe(true);
    expect(skirmishPrize('won', 3)).toEqual({ treasury: 90, kredits: 50 });
    expect(skirmishPrize('lost', 3).kredits).toBe(0);
    expect(guildRatingDelta('won')).toBe(5);
    expect(guildRatingDelta('lost', true)).toBe(-12);
  });

  it('дневной пересчёт: взносы местных, дрейф у гильдий местных, один раз в день', () => {
    let g = addMember(mk(), { id: 'npc:tolyan', name: 'Толян', level: 3 }).guild;
    expect(dailyContribution(g)).toBe(9);
    g = dailyGuildUpdate(g, '2026-01-01', seq([0.5]));
    expect(g.treasury).toBe(9);
    expect(dailyGuildUpdate(g, '2026-01-01', seq([0.5]))).toBe(g);
    const dogs = dailyGuildUpdate(NPC_GUILDS[0], '2026-01-01', seq([0.9]));
    expect(dogs.rating).toBeGreaterThan(NPC_GUILDS[0].rating);
    expect(dogs.treasury).toBeGreaterThan(NPC_GUILDS[0].treasury);
    expect(dogs.log).toHaveLength(0);
  });

  it('таблица и нормализация', () => {
    const g = { ...mk(), rating: 200 };
    const ladder = guildLadder(g, NPC_GUILDS);
    expect(ladder[0].id).toBe('guildhall');
    expect(ladderPlace(g, NPC_GUILDS)).toBe(2);
    expect(normalizeGuilds(undefined).map((x) => x.id)).toEqual(NPC_GUILDS.map((x) => x.id));
    const partial = normalizeGuilds([{ ...NPC_GUILDS[0], rating: 999 }]);
    expect(partial).toHaveLength(NPC_GUILDS.length);
    expect(partial[0].rating).toBe(999);
  });
});
