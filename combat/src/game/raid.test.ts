import { describe, expect, it } from 'vitest';

import { NPC_GUILDS } from './guild';
import {
  canStartRaid,
  DEFENDER_TITLE,
  defenseNews,
  enemyRaidDueAt,
  enemyRaidNews,
  newRaid,
  newRaidLog,
  normalizeRaidLog,
  RAID_FIGHTS,
  RAID_TITLE,
  RAID_WAR_EXTRA,
  RAID_WAR_POINTS,
  raidAfterFight,
  raidLoot,
  raidNews,
  raidOpponent,
  raidTarget,
  rollEnemyRaid,
} from './raid';
import { addWarPoints, newWar, WAR_PLAYER_POINTS, warAfterFight } from './war';

const DAY = '2026-11-04';

describe('рейд', () => {
  it('нижний ход ведёт в столицу чужой стороны', () => {
    expect(raidTarget('crown')).toBe('brod');
    expect(raidTarget('free')).toBe('city');
    const r = newRaid(DAY, 'free');
    expect(r.target).toBe('city');
    expect(r.side).toBe('crown');
    expect(r.status).toBe('active');
  });

  it('«игрок» чужой стороны: около твоего уровня, одет, с тегом чужой гильдии, сторона чужая', () => {
    let seed = 7;
    const rng = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 30; i += 1) {
      const o = raidOpponent('free', 4, NPC_GUILDS, rng);
      expect(o.side).toBe('free');
      expect(Math.abs(o.level - 4)).toBeLessThanOrEqual(1);
      expect(o.name).toMatch(/^\[(ПСЫ|ТИХ|ПЛОТ)\] /);
      expect(o.itemIds.length).toBeGreaterThan(0);
    }
    const crown = raidOpponent('crown', 2, NPC_GUILDS, rng);
    expect(crown.name).toMatch(/^\[(ЦЕХ|СБР)\] /);
    // Без гильдий — просто имя.
    expect(raidOpponent('crown', 2, [], rng).name).not.toMatch(/^\[/);
  });

  it('три боя подряд: победы двигают, поражение заканчивает, три победы — полный рейд', () => {
    let r = newRaid(DAY, 'crown');
    r = raidAfterFight(r, 'won', raidLoot(3));
    expect(r).toMatchObject({ stage: 1, kills: 1, status: 'active', loot: raidLoot(3) });
    r = raidAfterFight(r, 'won', 10);
    r = raidAfterFight(r, 'won', 10);
    expect(r.status).toBe('won');
    expect(r.kills).toBe(RAID_FIGHTS);
    expect(raidAfterFight(r, 'won', 10)).toBe(r); // законченный рейд не меняется
    const lost = raidAfterFight(raidAfterFight(newRaid(DAY, 'crown'), 'won', 5), 'lost', 0);
    expect(lost).toMatchObject({ stage: 2, kills: 1, status: 'lost', loot: 5 });
    expect(raidAfterFight(newRaid(DAY, 'crown'), 'draw', 0).status).toBe('lost');
    expect(raidLoot(0)).toBeGreaterThan(0);
    expect(raidLoot(5)).toBeGreaterThan(raidLoot(1));
  });

  it('очки войны: рейд даёт вдвое против обычного боя', () => {
    expect(RAID_WAR_POINTS).toBe(2 * WAR_PLAYER_POINTS);
    const w = newWar(DAY, 0);
    const after = addWarPoints(warAfterFight(w, 'crown', 'free', 'won'), 'crown', RAID_WAR_EXTRA);
    expect(after.crown).toBe(RAID_WAR_POINTS);
    expect(after.free).toBe(0);
  });

  it('не чаще раза в день и только с пройденным склепом', () => {
    const log = newRaidLog();
    expect(canStartRaid({ cleared: false, log, day: DAY, raid: null, hp: 10 }).ok).toBe(false);
    expect(canStartRaid({ cleared: true, log, day: DAY, raid: null, hp: 10 }).ok).toBe(true);
    expect(canStartRaid({ cleared: true, log, day: DAY, raid: null, hp: 0 }).ok).toBe(false);
    expect(canStartRaid({ cleared: true, log: { ...log, lastDay: DAY }, day: DAY, raid: null, hp: 10 }).ok).toBe(false);
    expect(canStartRaid({ cleared: true, log: { ...log, lastDay: '2026-11-03' }, day: DAY, raid: null, hp: 10 }).ok).toBe(true);
    expect(canStartRaid({ cleared: true, log, day: DAY, raid: newRaid(DAY, 'crown'), hp: 10 }).ok).toBe(false);
    expect(normalizeRaidLog(undefined)).toEqual(newRaidLog());
    expect(normalizeRaidLog({ won: 2 }).won).toBe(2);
    expect(normalizeRaidLog({ defense: {} as never }).defense).toBeNull();
  });

  it('новости в чат и ответный рейд чужих', () => {
    expect(raidNews('Вася', 'free', 'city', 3, 'won')).toBe('Вольница ворвалась в Город: Вася уложил троих и ушёл под землю. Полный рейд.');
    expect(raidNews('Вася', 'crown', 'brod', 1, 'lost')).toContain('уложил одного');
    expect(raidNews('Вася', 'crown', 'brod', 0, 'lost')).toContain('лёг у первых же ворот');
    let seed = 3;
    const rng = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    const e = rollEnemyRaid('crown', 3, NPC_GUILDS, rng);
    expect(e.side).toBe('free');
    expect(e.town).toBe('city');
    expect(e.kills).toBeGreaterThanOrEqual(1);
    expect(e.kills).toBeLessThanOrEqual(RAID_FIGHTS);
    expect(e.points).toBe(e.kills * RAID_WAR_POINTS);
    expect(enemyRaidNews(e)).toContain('Вольница ворвалась в Город');
    expect(defenseNews(e)).toContain('можешь отбиться');
    // Час налёта в пределах дня и один и тот же для одного дня.
    const now = new Date('2026-11-04T06:00:00').getTime();
    const due = enemyRaidDueAt(DAY, now);
    expect(due).toBe(enemyRaidDueAt(DAY, now + 3_600_000));
    expect(new Date(due).getHours()).toBeGreaterThanOrEqual(8);
    expect(new Date(due).getHours()).toBeLessThanOrEqual(21);
    expect(RAID_TITLE).not.toBe(DEFENDER_TITLE);
  });
});
