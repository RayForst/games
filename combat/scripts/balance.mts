// Симуляция баланса: доход в час и цены по уровням. Запуск: npm run balance.
// Боец «универсал» в лучшем доступном по уровню шмоте против ботов зала (равный уровень, стандартная одежда).
import { deriveStats, baseStats, statPointsTotal } from '../src/game/formulas.ts';
import { ITEMS, upgradeCost, repairCost, maxDurability } from '../src/game/items.ts';
import { generateOpponent } from '../src/game/opponents.ts';
import { resolveTurn } from '../src/game/combat.ts';
import { chooseEnemyMove } from '../src/game/ai.ts';
import { rewardFor, expForLevel } from '../src/game/leveling.ts';
import { mineRatePerHour } from '../src/game/mine.ts';
import { gatherRatePerHour, ACTIVITIES, RESOURCES_BY_ID } from '../src/game/wilds.ts';
import { tournamentPrize } from '../src/game/tournament.ts';
import { ZONES, BLOCKS, SLOTS, type Stats, type Slot, type Zone, type Block } from '../src/game/types.ts';

const rng = Math.random;
const pick = <T,>(a: readonly T[]) => a[Math.floor(rng() * a.length)];

function buildStats(level: number): Stats {
  // Универсал: очки поровну.
  const s = baseStats();
  let pts = statPointsTotal(level) - 12;
  const keys = ['strength', 'endurance', 'dexterity', 'intuition'] as const;
  let i = 0;
  while (pts > 0) {
    s[keys[i % 4]] += 1;
    pts -= 1;
    i += 1;
  }
  return s;
}

function bestGear(level: number, stats: Stats): { ids: string[]; cost: number } {
  const ids: string[] = [];
  let cost = 0;
  for (const slot of SLOTS as Slot[]) {
    const ok = ITEMS.filter((it) => it.slot === slot && it.level <= level && Object.entries(it.requires ?? {}).every(([k, v]) => stats[k as keyof Stats] >= (v ?? 0)));
    if (!ok.length) continue;
    const best = ok.sort((a, b) => b.price - a.price)[0];
    ids.push(best.id);
    cost += best.price;
  }
  return { ids, cost };
}

function simFight(level: number, ids: string[], stats: Stats): { won: boolean; turns: number } {
  const me = { name: 'me', level, derived: deriveStats(stats, level, ids) };
  const foe = generateOpponent(level, rng, new Set(), Math.min(1, 0.4 + level * 0.2) * 0.8);
  const enemy = { name: foe.name, level: foe.level, derived: foe.derived };
  let hp = me.derived.maxHp;
  let ehp = enemy.derived.maxHp;
  const moves: { attack: Zone; block: Block }[] = [];
  for (let t = 1; t <= 60; t += 1) {
    const my = { attack: pick(ZONES), block: pick(BLOCKS) };
    const r = resolveTurn(me, enemy, hp, ehp, my, chooseEnemyMove(level, moves, rng), rng);
    moves.push(my);
    hp = r.playerHp;
    ehp = r.enemyHp;
    if (r.status !== 'active') return { won: r.status === 'won', turns: t };
  }
  return { won: false, turns: 60 };
}

console.log('| ур. | винрейт | раундов | кр./бой | опыт/бой | боёв до след. ур. | шахта кр./ч | дикие земли кр./ч | весь шмот уровня | ремонт всего (прочность) | заточка +1 оружия | приз турнира |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (let level = 0; level <= 6; level += 1) {
  const stats = buildStats(level);
  const gear = bestGear(level, stats);
  const N = 400;
  let wins = 0;
  let turns = 0;
  let kr = 0;
  let exp = 0;
  for (let i = 0; i < N; i += 1) {
    const f = simFight(level, gear.ids, stats);
    wins += f.won ? 1 : 0;
    turns += f.turns;
    const rw = rewardFor(f.won ? 'won' : 'lost', level, level, rng);
    kr += rw.kredits;
    exp += rw.exp;
  }
  const d = deriveStats(stats, level, gear.ids);
  const mine = mineRatePerHour(d);
  const gather = Math.max(...ACTIVITIES.map((a) => gatherRatePerHour(a.id, d) * RESOURCES_BY_ID[a.resource].basePrice));
  const fightsToLevel = Math.ceil((expForLevel(level + 1) - expForLevel(level)) / (exp / N));
  const defs = gear.ids.map((id) => ITEMS.find((i) => i.id === id)!);
  const repair = defs.reduce((s, it) => s + repairCost(it, 0), 0);
  const dur = Math.round(defs.reduce((s, it) => s + maxDurability(it), 0) / Math.max(1, defs.length));
  const weapon = defs.find((it) => it.slot === 'weapon');
  const sharpen = weapon ? upgradeCost(weapon, 1) : 0;
  console.log(
    `| ${level} | ${Math.round((wins / N) * 100)} % | ${(turns / N).toFixed(1)} | ${(kr / N).toFixed(1)} | ${(exp / N).toFixed(1)} | ${fightsToLevel} | ${mine} | ${gather} | ${gear.cost} | ${repair} (${dur} боёв) | ${sharpen} | ${tournamentPrize(level).kredits} |`,
  );
}
