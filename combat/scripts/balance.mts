// Симуляция баланса 2.0. Запуск: npm run balance [-- --n=400 --seed=1 --level=5 --short].
// Эталонные игроки трёх архетипов в лучшем доступном шмоте (с кольцами и амулетом), двуручник против щита,
// против зала Города и Брода; доходы всех источников за час с учётом регенерации; цена комплекта и «боёв до комплекта»;
// доля ремонта в доходе; шанс травм за день; бонусы гильдии. Ходы игрока случайные, бот — обычный ИИ зала.
import { deriveStats, baseStats, statPointsTotal, FULL_REGEN_MINUTES } from '../src/game/formulas.ts';
import { ITEMS, upgradeCost, repairCost, maxDurability } from '../src/game/items.ts';
import { generateArena, generateOpponent } from '../src/game/opponents.ts';
import { resolveTurn } from '../src/game/combat.ts';
import { chooseEnemyMove } from '../src/game/ai.ts';
import { rewardFor, expForLevel } from '../src/game/leveling.ts';
import { jobRatePerHour, CARAVAN_AMBUSH } from '../src/game/mine.ts';
import { gatherRatePerHour, ACTIVITIES_BY_ID, RESOURCES_BY_ID, WILDS, MARKET_MULT, wildOpponent, haulAfterAmbush, type WildId } from '../src/game/wilds.ts';
import { locationOpen } from '../src/game/world.ts';
import { tournamentPrize, tournamentLevels } from '../src/game/tournament.ts';
import { QUEST_TEMPLATES } from '../src/game/quests.ts';
import { guildPerks, guildLevelCost, skirmishPrize, NPC_GUILDS, skirmishOpponent, GUILD_MAX_LEVEL } from '../src/game/guild.ts';
import { RIVALS, rivalOpponent } from '../src/game/rivals.ts';
import { INJURY_INFO } from '../src/game/character.ts';
import { ZONES, BLOCKS, SLOTS, itemSlotOf, STAT_KEYS, type Stats, type Slot, type Zone, type Block, type Opponent, type ItemDef, type DerivedStats, type FightStatus } from '../src/game/types.ts';

// ─── Параметры ──────────────────────────────────────────────────────────────

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? 'true']));
const N = Number(args.n ?? 400);
const SEED = Number(args.seed ?? 1);
const ONLY_LEVEL = args.level !== undefined ? Number(args.level) : null;
const SHORT = args.short === 'true';
const LEVELS = ONLY_LEVEL !== null ? [ONLY_LEVEL] : [0, 1, 2, 3, 4, 5, 6];

/** Арена Брода: множители награды из стора (settle). */
const BROD_KREDITS = 1.2;
const BROD_EXP = 1.2;
/** Секунд на раунд боя — чтобы перевести бои в часы. */
const SECONDS_PER_ROUND = 10;
/** Сколько боёв в день считаем для шанса травмы. */
const FIGHTS_PER_DAY = 20;

// ─── Случайность: свой сид, чтобы прогоны сравнивались ──────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(SEED);
const reseed = (salt: number) => {
  rng = mulberry32(SEED * 7919 + salt);
};
const pick = <T,>(a: readonly T[]) => a[Math.floor(rng() * a.length)];

// ─── Эталонные игроки ───────────────────────────────────────────────────────

type ArchName = 'воин' | 'ловкач' | 'универсал';
const ARCHS: Record<ArchName, Record<keyof Stats, number>> = {
  воин: { strength: 4, endurance: 3, dexterity: 1, intuition: 1 },
  ловкач: { strength: 1, endurance: 2, dexterity: 4, intuition: 2 },
  универсал: { strength: 1, endurance: 1, dexterity: 1, intuition: 1 },
};
type WeaponMode = 'щит' | 'двуручник';

/** Очки по весам архетипа, детерминированно (по наибольшему остатку). */
function buildStats(level: number, weights: Record<keyof Stats, number>): Stats {
  const s = baseStats();
  const pts = statPointsTotal(level) - STAT_KEYS.reduce((sum, k) => sum + s[k], 0);
  const total = STAT_KEYS.reduce((sum, k) => sum + weights[k], 0);
  const exact = STAT_KEYS.map((k) => (pts * weights[k]) / total);
  const floor = exact.map(Math.floor);
  let rest = pts - floor.reduce((a, b) => a + b, 0);
  const order = STAT_KEYS.map((_, i) => i).sort((a, b) => exact[b] - floor[b] - (exact[a] - floor[a]));
  for (const i of order) if (rest-- > 0) floor[i] += 1;
  STAT_KEYS.forEach((k, i) => (s[k] += floor[i]));
  return s;
}

interface Gear {
  ids: string[];
  defs: ItemDef[];
  cost: number;
  derived: DerivedStats;
}

/**
 * Лучший доступный комплект: самая дорогая вещь слота не выше уровня, требования считаются по характеристикам
 * с учётом уже надетого (как `canEquip`). Перебираем до стабильного состояния: перчатки и кольца открывают доспех.
 */
function bestGear(level: number, stats: Stats, mode: WeaponMode): Gear {
  const chosen: Partial<Record<Slot, ItemDef>> = {};
  const derivedNow = () => deriveStats(stats, level, Object.values(chosen).map((d) => d.id));
  for (let pass = 0; pass < 4; pass += 1) {
    const eff = derivedNow().stats;
    for (const slot of SLOTS) {
      if (slot === 'shield' && mode === 'двуручник') continue;
      let ok = ITEMS.filter((it) => it.slot === itemSlotOf(slot) && it.level <= level && STAT_KEYS.every((k) => eff[k] >= (it.requires?.[k] ?? 0)));
      if (slot === 'weapon') {
        const twoHanded = ok.filter((it) => it.twoHanded);
        ok = mode === 'двуручник' && twoHanded.length ? twoHanded : ok.filter((it) => !it.twoHanded);
      }
      if (!ok.length) continue;
      chosen[slot] = ok.sort((a, b) => b.level - a.level || b.price - a.price)[0];
    }
  }
  const defs = SLOTS.map((s) => chosen[s]).filter((d): d is ItemDef => !!d);
  return { ids: defs.map((d) => d.id), defs, cost: defs.reduce((s, d) => s + d.price, 0), derived: derivedNow() };
}

// ─── Бой ────────────────────────────────────────────────────────────────────

interface FightOutcome {
  status: FightStatus;
  rounds: number;
  hpLost: number;
}

function simFight(level: number, derived: DerivedStats, foe: Opponent): FightOutcome {
  const me = { name: 'me', level, derived };
  const enemy = { name: foe.name, level: foe.level, derived: foe.derived };
  let hp = derived.maxHp;
  let ehp = enemy.derived.maxHp;
  const moves: { attack: Zone; block: Block }[] = [];
  for (let t = 1; t <= 60; t += 1) {
    const my = { attack: pick(ZONES), block: pick(BLOCKS) };
    const r = resolveTurn(me, enemy, hp, ehp, my, chooseEnemyMove(foe.level, moves, rng), rng);
    moves.push(my);
    hp = r.playerHp;
    ehp = r.enemyHp;
    if (r.status !== 'active') return { status: r.status, rounds: t, hpLost: derived.maxHp - hp };
  }
  return { status: 'draw', rounds: 60, hpLost: derived.maxHp - hp };
}

interface Series {
  win: number;
  draw: number;
  loss: number;
  kredits: number;
  exp: number;
  rounds: number;
  /** Часов на один бой с учётом регенерации. */
  hoursPerFight: number;
}

/** Серия боёв против зала: соперник выбирается случайно из четырёх слотов. */
function runSeries(level: number, derived: DerivedStats, hall: () => Opponent[], mult: { kredits: number; exp: number }, n = N): Series {
  const s: Series = { win: 0, draw: 0, loss: 0, kredits: 0, exp: 0, rounds: 0, hoursPerFight: 0 };
  let seconds = 0;
  for (let i = 0; i < n; i += 1) {
    const foe = pick(hall());
    const f = simFight(level, derived, foe);
    s[f.status === 'won' ? 'win' : f.status === 'draw' ? 'draw' : 'loss'] += 1;
    const rw = rewardFor(f.status, level, foe.level, rng);
    s.kredits += Math.round(rw.kredits * mult.kredits);
    s.exp += Math.round(rw.exp * mult.exp);
    s.rounds += f.rounds;
    // Регенерация: полное восстановление за FULL_REGEN_MINUTES, ждём ровно потерянное.
    seconds += f.rounds * SECONDS_PER_ROUND + (f.hpLost / derived.maxHp) * FULL_REGEN_MINUTES * 60;
  }
  s.hoursPerFight = seconds / n / 3600;
  return s;
}

const cityHall = (level: number) => () => generateArena(level, rng, rivalOpponent(pick(RIVALS.filter((r) => level + r.levelOffset >= 0)), level, rng));
const brodHall = (level: number) => () => generateArena(level + 1, rng);

const pct = (x: number) => `${Math.round(x * 100)} %`;
const f1 = (x: number) => x.toFixed(1);

/** Ремонт за бой: каждая надетая вещь теряет 1 прочность. */
function repairPerFight(defs: ItemDef[]): number {
  return defs.reduce((s, it) => s + repairCost(it, 0) / maxDurability(it), 0);
}

/** Ожидаемая награда боя как ставка: p(win) × награда победы и т. д. — для источников, где бой не главный. */
function fightValue(level: number, derived: DerivedStats, foeOf: () => Opponent, n = Math.max(50, N / 4)): { winRate: number; hpLost: number } {
  let wins = 0;
  let hpLost = 0;
  for (let i = 0; i < n; i += 1) {
    const f = simFight(level, derived, foeOf());
    wins += f.status === 'won' ? 1 : 0;
    hpLost += f.hpLost;
  }
  return { winRate: wins / n, hpLost: hpLost / n };
}

// ─── 1. Архетипы × оружие × зал ─────────────────────────────────────────────

interface Row {
  level: number;
  arch: ArchName;
  mode: WeaponMode;
  gear: Gear;
  city: Series;
  brod: Series;
}

const rows: Row[] = [];
for (const level of LEVELS) {
  for (const arch of Object.keys(ARCHS) as ArchName[]) {
    for (const mode of ['щит', 'двуручник'] as WeaponMode[]) {
      reseed(level * 100 + Object.keys(ARCHS).indexOf(arch) * 10 + (mode === 'щит' ? 0 : 1));
      const stats = buildStats(level, ARCHS[arch]);
      const gear = bestGear(level, stats, mode);
      const city = runSeries(level, gear.derived, cityHall(level), { kredits: 1, exp: 1 });
      const brod = level >= 3 ? runSeries(level, gear.derived, brodHall(level), { kredits: BROD_KREDITS, exp: BROD_EXP }) : city;
      rows.push({ level, arch, mode, gear, city, brod });
    }
  }
}

console.log('## Эталонные игроки против зала Города (4 слота: именной, двое равных, один сильнее)\n');
console.log('| ур. | архетип | оружие | комплект, кр. | винрейт | ничьи | раундов | кр./бой | чист. кр./бой | ремонт, доля | кр./ч (с регеном) | боёв до комплекта |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) {
  const s = r.city;
  const kr = s.kredits / N;
  const rep = repairPerFight(r.gear.defs);
  const net = kr - rep;
  const weapon = r.gear.defs.find((d) => d.slot === 'weapon');
  console.log(
    `| ${r.level} | ${r.arch} | ${r.mode === 'двуручник' ? weapon?.twoHanded ? 'двуручник' : 'двуручник (нет)' : weapon && r.gear.defs.some((d) => d.slot === 'shield') ? 'щит' : 'щит (нет)'} | ${r.gear.cost} | ${pct(s.win / N)} | ${pct(s.draw / N)} | ${f1(s.rounds / N)} | ${f1(kr)} | ${f1(net)} | ${pct(rep / Math.max(1, kr))} | ${Math.round(net / s.hoursPerFight)} | ${Math.ceil(r.gear.cost / Math.max(1, net))} |`,
  );
}

console.log('\n## Арена Брода (соперники на уровень выше, плата ×1.2, опыт ×1.2) против Города, с 3 уровня\n');
console.log('| ур. | архетип | оружие | винрейт Город | винрейт Брод | кр./ч Город | кр./ч Брод | Брод / Город | опыт/бой Город | опыт/бой Брод |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows.filter((x) => x.level >= 3)) {
  const rep = repairPerFight(r.gear.defs);
  const c = (r.city.kredits / N - rep) / r.city.hoursPerFight;
  const b = (r.brod.kredits / N - rep) / r.brod.hoursPerFight;
  console.log(`| ${r.level} | ${r.arch} | ${r.mode} | ${pct(r.city.win / N)} | ${pct(r.brod.win / N)} | ${Math.round(c)} | ${Math.round(b)} | ${pct(b / c)} | ${f1(r.city.exp / N)} | ${f1(r.brod.exp / N)} |`);
}

// ─── 2. Сводка по уровням (среднее по архетипам и оружию) ──────────────────

console.log('\n## Сводка по уровням (среднее по трём архетипам и двум видам оружия)\n');
console.log('| ур. | винрейт Город | винрейт Брод | кр./бой | опыт/бой | боёв до след. ур. | комплект, кр. | боёв до комплекта | ремонт, доля | травма за день (20 боёв) | лечение травмы, кр. |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
for (const level of LEVELS) {
  const rs = rows.filter((r) => r.level === level);
  const win = avg(rs.map((r) => r.city.win / N));
  const draw = avg(rs.map((r) => r.city.draw / N));
  const loss = avg(rs.map((r) => r.city.loss / N));
  const kr = avg(rs.map((r) => r.city.kredits / N));
  const exp = avg(rs.map((r) => r.city.exp / N));
  const rep = avg(rs.map((r) => repairPerFight(r.gear.defs)));
  const cost = avg(rs.map((r) => r.gear.cost));
  const injuryPerFight = loss * 0.4 + draw * 0.15;
  const injuryDay = 1 - (1 - injuryPerFight) ** FIGHTS_PER_DAY;
  const cure = Math.ceil(INJURY_INFO.medium.cureBase * (1 + level * 0.4));
  console.log(
    `| ${level} | ${pct(win)} | ${level >= 3 ? pct(avg(rs.map((r) => r.brod.win / N))) : '—'} | ${f1(kr)} | ${f1(exp)} | ${Math.ceil((expForLevel(level + 1) - expForLevel(level)) / exp)} | ${Math.round(cost)} | ${Math.ceil(cost / (kr - rep))} | ${pct(rep / kr)} | ${pct(injuryDay)} | ${cure} |`,
  );
}

if (!SHORT) {
  // ─── 3. Доходы всех источников ─────────────────────────────────────────────

  console.log('\n## Доходы источников, кр./ч (универсал со щитом; арена — с регенерацией и за вычетом ремонта)\n');
  console.log('| ур. | арена Город | арена Брод | шахта | караван (засада 35 %) | лучшие дикие земли (с засадой) | те же, рынок Брода | стычки, кр./день (3) | задания, кр./день (3) | турнир, кр./день | заточка +1 оружия |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const level of LEVELS) {
    reseed(5000 + level);
    const r = rows.find((x) => x.level === level && x.arch === 'универсал' && x.mode === 'щит')!;
    const d = r.gear.derived;
    const rep = repairPerFight(r.gear.defs);
    const arenaCity = (r.city.kredits / N - rep) / r.city.hoursPerFight;
    const arenaBrod = level >= 3 ? (r.brod.kredits / N - rep) / r.brod.hoursPerFight : 0;
    const mine = jobRatePerHour('mine', d);
    // Караван: при засаде бой с разбойником перевала за плату: победа +25 %, поражение −50 %.
    let caravan = 0;
    if (level >= 3) {
      const v = fightValue(level, d, () => wildOpponent('pass', level, rng));
      const rate = jobRatePerHour('caravan', d);
      caravan = rate * (1 - CARAVAN_AMBUSH + CARAVAN_AMBUSH * (v.winRate * 1.25 + (1 - v.winRate) * 0.5));
    }
    // Дикие земли: лучшее занятие среди открытых локаций, с ожиданием засады; цена рынка средняя (база).
    let bestWild = 0;
    let bestWildBrod = 0;
    for (const wild of Object.keys(WILDS) as WildId[]) {
      if (!locationOpen(wild, level)) continue;
      const def = WILDS[wild];
      const v = fightValue(level, d, () => wildOpponent(wild, level, rng));
      const ambush = 1 - def.ambushChance + def.ambushChance * (v.winRate * (haulAfterAmbush(100, true) / 100) + (1 - v.winRate) * (haulAfterAmbush(100, false) / 100));
      for (const aid of def.activities) {
        const a = ACTIVITIES_BY_ID[aid];
        const perHour = gatherRatePerHour(aid, d) * RESOURCES_BY_ID[a.resource].basePrice * ambush;
        bestWild = Math.max(bestWild, perHour * MARKET_MULT.city);
        bestWildBrod = Math.max(bestWildBrod, perHour * MARKET_MULT.brod);
      }
    }
    // Стычки: до трёх в день против бойца чужой гильдии (ближайшего уровня, одет на 0.7) — награда боя плюс приз.
    let skirm = 0;
    if (level >= 3) {
      const g = NPC_GUILDS[1];
      let sum = 0;
      const n = Math.max(50, N / 4);
      for (let i = 0; i < n; i += 1) {
        const foe = skirmishOpponent(g, level, rng);
        const f = simFight(level, d, foe);
        sum += rewardFor(f.status, level, foe.level, rng).kredits + skirmishPrize(f.status, g.level).kredits;
      }
      skirm = (sum / n) * 3;
    }
    // Задания: три в день, среднее по шаблонам и целям.
    const questAvg = avg(QUEST_TEMPLATES.map((t) => avg(t.targets.map((n) => Math.round(t.kreditsPer * n * (1 + level * 0.4))))));
    // Турнир: приз × шанс пройти четыре боя подряд без регенерации (hp не восстанавливается).
    let tourn = 0;
    {
      const n = Math.max(50, N / 4);
      let passed = 0;
      let perFight = 0;
      for (let i = 0; i < n; i += 1) {
        let hp = d.maxHp;
        let ok = true;
        for (const l of tournamentLevels(level)) {
          const foe = generateOpponent(l, rng, new Set(), 1);
          const me = { name: 'me', level, derived: d };
          const enemy = { name: foe.name, level: foe.level, derived: foe.derived };
          let ehp = enemy.derived.maxHp;
          const moves: { attack: Zone; block: Block }[] = [];
          let status: FightStatus = 'active';
          for (let t = 1; t <= 60 && status === 'active'; t += 1) {
            const my = { attack: pick(ZONES), block: pick(BLOCKS) };
            const res = resolveTurn(me, enemy, hp, ehp, my, chooseEnemyMove(foe.level, moves, rng), rng);
            moves.push(my);
            hp = res.playerHp;
            ehp = res.enemyHp;
            status = res.status;
          }
          perFight += rewardFor(status === 'active' ? 'draw' : status, level, l, rng).kredits;
          if (status !== 'won') {
            ok = false;
            break;
          }
        }
        if (ok) passed += 1;
      }
      tourn = (passed / n) * tournamentPrize(level).kredits + perFight / n;
    }
    const weapon = r.gear.defs.find((it) => it.slot === 'weapon');
    console.log(
      `| ${level} | ${Math.round(arenaCity)} | ${level >= 3 ? Math.round(arenaBrod) : '—'} | ${mine} | ${level >= 3 ? Math.round(caravan) : '—'} | ${Math.round(bestWild)} | ${level >= 3 ? Math.round(bestWildBrod) : '—'} | ${level >= 3 ? Math.round(skirm) : '—'} | ${Math.round(questAvg * 3)} | ${Math.round(tourn)} | ${weapon ? upgradeCost(weapon, 1) : 0} |`,
    );
  }

  // ─── 4. Гильдия ────────────────────────────────────────────────────────────

  console.log('\n## Гильдия: бонусы по уровням (арена Города, универсал со щитом 5-го уровня)\n');
  console.log('| ур. гильдии | цена, кр. | опыт | кредиты | мест | кр./ч на арене | окупаемость, ч |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  {
    const r = rows.find((x) => x.level === (LEVELS.includes(5) ? 5 : LEVELS[LEVELS.length - 1]) && x.arch === 'универсал' && x.mode === 'щит')!;
    const rep = repairPerFight(r.gear.defs);
    const base = (r.city.kredits / N - rep) / r.city.hoursPerFight;
    for (let g = 1; g <= GUILD_MAX_LEVEL; g += 1) {
      const p = guildPerks(g);
      const perHour = (r.city.kredits / N * p.kreditsMult - rep) / r.city.hoursPerFight;
      const cost = g === 1 ? 0 : guildLevelCost(g - 1);
      console.log(`| ${g} | ${cost} | ×${p.expMult} | ×${p.kreditsMult} | ${p.maxMembers} | ${Math.round(perHour)} | ${g === 1 ? '—' : Math.round(cost / Math.max(0.1, perHour - base))} |`);
    }
  }
}
