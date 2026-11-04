import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  activeInjury,
  applyQuestEvent,
  applyRegen,
  canEquip,
  canUpgrade,
  cureCost,
  dayKey,
  generateBoard,
  chooseEnemyMove,
  deriveCharacter,
  describeFinish,
  describeStrike,
  generateArena,
  getItem,
  heavier,
  healAmount,
  healPrice,
  isEquipped,
  isShiftHours,
  levelForExp,
  makeLogLine,
  maxDurability,
  mineEarnings,
  mineElapsedMs,
  mineRatePerHour,
  newCharacter,
  newInventoryItem,
  normalizeCharacter,
  offerPerks,
  perkPicksBetween,
  POINTS_PER_LEVEL,
  questDone,
  questReward,
  repairCost,
  resolveTurn,
  rewardFor,
  rollInjury,
  injuryText,
  sellPrice,
  toFighter,
  upgradeCost,
  UPGRADE_MAX,
  wearEquipment,
  type Character,
  type Check,
  type FightState,
  type Mining,
  type Move,
  type Opponent,
  type PerkId,
  type QuestBoard,
  type QuestEvent,
  type Slot,
  type StatKey,
  type Stats,
} from '@/game';

export interface MineResult extends Check {
  kredits?: number;
}

const rng = Math.random;

function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export interface GameState {
  character: Character | null;
  fight: FightState | null;
  arena: Opponent[];
  /** Текущая смена в шахте. */
  mining: Mining | null;
  /** Доска заданий пивной на сегодня. */
  quests: QuestBoard | null;
  hydrated: boolean;

  setHydrated: () => void;
  createCharacter: (name: string, stats: Stats, freePoints: number) => void;
  resetGame: () => void;

  addStat: (stat: StatKey) => void;
  /** Выбрать умение из текущего предложения. */
  choosePerk: (id: PerkId) => Check;
  tick: () => void;
  /** Лечение у лекаря: доля максимального hp (зелья 0.3 / 0.6 / 1). */
  heal: (fraction?: number) => Check;
  /** Снять травму у лекаря. */
  cureInjury: () => MineResult;

  buyItem: (itemId: string) => Check;
  sellItem: (itemUid: string) => Check;
  equip: (itemUid: string) => Check;
  unequip: (slot: Slot) => void;

  refreshArena: () => void;
  startFight: (opponentId: string) => Check;
  playTurn: (move: Move) => void;
  endFight: () => void;

  startMining: (hours: number) => Check;
  collectMining: () => MineResult;

  /** Кузница. */
  repairItem: (itemUid: string) => MineResult;
  repairAll: () => MineResult;
  upgradeItem: (itemUid: string) => Check;

  /** Пивная: доска на сегодня (пересоздаётся на новый день), прогресс и награда. */
  ensureQuests: () => QuestBoard | null;
  track: (event: QuestEvent, amount?: number) => void;
  claimQuest: (questId: string) => MineResult;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      character: null,
      fight: null,
      arena: [],
      mining: null,
      quests: null,
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      createCharacter: (name, stats, freePoints) => {
        const character = newCharacter(name, stats, freePoints);
        set({ character, fight: null, mining: null, quests: null, arena: generateArena(character.level, rng) });
      },

      resetGame: () => set({ character: null, fight: null, mining: null, quests: null, arena: [] }),

      ensureQuests: () => {
        const { character, quests } = get();
        if (!character) return null;
        if (quests && quests.day === dayKey()) return quests;
        const board = generateBoard(rng);
        set({ quests: board });
        return board;
      },

      track: (event, amount = 1) => {
        const board = get().ensureQuests();
        if (!board) return;
        const next = applyQuestEvent(board, event, amount);
        if (next !== board) set({ quests: next });
      },

      claimQuest: (questId) => {
        const c = get().character;
        const board = get().ensureQuests();
        if (!c || !board) return { ok: false, reason: 'Нет персонажа' };
        const q = board.quests.find((x) => x.id === questId);
        if (!q) return { ok: false, reason: 'Задания нет' };
        if (q.claimed) return { ok: false, reason: 'Уже забрал' };
        if (!questDone(q)) return { ok: false, reason: 'Ещё не выполнено' };
        const reward = questReward(q, c.level);
        const exp = c.exp + reward.exp;
        const newLevel = levelForExp(exp);
        const levelsGained = newLevel - c.level;
        const character: Character = {
          ...c,
          kredits: c.kredits + reward.kredits,
          exp,
          level: newLevel,
          freePoints: c.freePoints + levelsGained * POINTS_PER_LEVEL,
        };
        set({
          character,
          quests: { ...board, quests: board.quests.map((x) => (x.id === questId ? { ...x, claimed: true } : x)) },
        });
        return { ok: true, kredits: reward.kredits };
      },

      addStat: (stat) => {
        const c = get().character;
        if (!c || c.freePoints <= 0) return;
        const stats = { ...c.stats, [stat]: c.stats[stat] + 1 };
        const next: Character = { ...c, stats, freePoints: c.freePoints - 1 };
        // Выносливость поднимает максимум — текущее hp растёт вместе с ним.
        if (stat === 'endurance') {
          const gained = deriveCharacter(next).maxHp - deriveCharacter(c).maxHp;
          next.hp = Math.min(deriveCharacter(next).maxHp, next.hp + gained);
        }
        set({ character: next });
      },

      choosePerk: (id) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (!c.perkChoices?.includes(id)) return { ok: false, reason: 'Такого выбора нет' };
        const perks = [...c.perks, id];
        const perkPicks = Math.max(0, c.perkPicks - 1);
        const next: Character = { ...c, perks, perkPicks, perkChoices: perkPicks > 0 ? offerPerks(perks as PerkId[], rng) : null };
        // «Железное брюхо» поднимает максимум — текущее hp растёт вместе с ним.
        const gained = deriveCharacter(next).maxHp - deriveCharacter(c).maxHp;
        if (gained > 0) next.hp = Math.min(deriveCharacter(next).maxHp, next.hp + gained);
        set({ character: next });
        return { ok: true };
      },

      tick: () => {
        const c = get().character;
        if (!c || get().fight?.status === 'active') return;
        let next = applyRegen(c);
        // Травма прошла сама — убираем, чтобы экраны перестали её показывать.
        if (next.injury && !activeInjury(next)) next = { ...next, injury: null };
        if (next !== c) set({ character: next });
      },

      cureInjury: () => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const injury = activeInjury(c);
        if (!injury) return { ok: false, reason: 'Травм нет' };
        const cost = cureCost(c, injury);
        if (c.kredits < cost) return { ok: false, reason: `Нужно ${cost} кр.` };
        set({ character: { ...c, injury: null, kredits: c.kredits - cost } });
        return { ok: true, kredits: cost };
      },

      heal: (fraction = 1) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const maxHp = deriveCharacter(c).maxHp;
        if (c.hp >= maxHp) return { ok: false, reason: 'Ты и так здоров' };
        const cost = healPrice(c, fraction);
        if (c.kredits < cost) return { ok: false, reason: `Нужно ${cost} кр.` };
        const hp = Math.min(maxHp, c.hp + healAmount(c, fraction));
        set({ character: { ...c, hp, kredits: c.kredits - cost, hpUpdatedAt: Date.now() } });
        get().track('heal');
        return { ok: true };
      },

      buyItem: (itemId) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const item = getItem(itemId);
        if (c.kredits < item.price) return { ok: false, reason: 'Не хватает кредитов' };
        set({
          character: {
            ...c,
            kredits: c.kredits - item.price,
            backpack: [...c.backpack, newInventoryItem(uid(), itemId)],
          },
        });
        get().track('buyItem');
        return { ok: true };
      },

      sellItem: (itemUid) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const inv = c.backpack.find((i) => i.uid === itemUid);
        if (!inv) return { ok: false, reason: 'Предмет не найден' };
        const item = getItem(inv.itemId);
        const equipment = { ...c.equipment };
        for (const slot of Object.keys(equipment) as Slot[]) if (equipment[slot] === itemUid) equipment[slot] = null;
        set({
          character: {
            ...c,
            equipment,
            kredits: c.kredits + sellPrice(item, inv.upgrade),
            backpack: c.backpack.filter((i) => i.uid !== itemUid),
          },
        });
        return { ok: true };
      },

      equip: (itemUid) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const inv = c.backpack.find((i) => i.uid === itemUid);
        if (!inv) return { ok: false, reason: 'Предмет не найден' };
        if (isEquipped(c, itemUid)) return { ok: false, reason: 'Уже надето' };
        const item = getItem(inv.itemId);
        // Проверяем требования без предмета, который сейчас занимает слот.
        const without: Character = { ...c, equipment: { ...c.equipment, [item.slot]: null } };
        const check = canEquip(without, item);
        if (!check.ok) return check;
        const next: Character = { ...c, equipment: { ...c.equipment, [item.slot]: itemUid } };
        next.hp = Math.min(next.hp, deriveCharacter(next).maxHp);
        set({ character: next });
        return { ok: true };
      },

      unequip: (slot) => {
        const c = get().character;
        if (!c || !c.equipment[slot]) return;
        const next: Character = { ...c, equipment: { ...c.equipment, [slot]: null } };
        next.hp = Math.min(next.hp, deriveCharacter(next).maxHp);
        set({ character: next });
      },

      refreshArena: () => {
        const c = get().character;
        if (!c) return;
        set({ arena: generateArena(c.level, rng) });
      },

      startFight: (opponentId) => {
        const state = get();
        const c = state.character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Бой уже идёт' };
        if (state.mining) return { ok: false, reason: 'Ты в шахте. Сначала забери заработок.' };
        const opponent = state.arena.find((o) => o.id === opponentId);
        if (!opponent) return { ok: false, reason: 'Соперник ушёл' };
        const fresh = applyRegen(c);
        if (fresh.hp < 1) return { ok: false, reason: 'Нет сил драться. Подожди или сходи к лекарю.' };

        const fight: FightState = {
          opponent,
          playerHp: fresh.hp,
          enemyHp: opponent.derived.maxHp,
          turn: 1,
          status: 'active',
          log: [
            makeLogLine(0, `${fresh.name} против ${opponent.name}. Бой начался!`, 'system'),
            ...(activeInjury(fresh) ? [makeLogLine(0, `${fresh.name} дерётся с травмой: ${injuryText(activeInjury(fresh)!).toLowerCase()}.`, 'system')] : []),
          ],
          playerMoves: [],
          lastEnemyMove: null,
          reward: null,
          startedAt: Date.now(),
        };
        set({ character: fresh, fight });
        return { ok: true };
      },

      playTurn: (move) => {
        const state = get();
        const c = state.character;
        const f = state.fight;
        if (!c || !f || f.status !== 'active') return;

        const player = toFighter(c);
        const enemy = { name: f.opponent.name, level: f.opponent.level, derived: f.opponent.derived };
        const enemyMove = chooseEnemyMove(f.opponent.level, f.playerMoves, rng);
        const result = resolveTurn(player, enemy, f.playerHp, f.enemyHp, move, enemyMove, rng);

        const [ps, es] = result.strikes;
        const log = [
          ...f.log,
          makeLogLine(f.turn, describeStrike(c.name, f.opponent.name, ps), 'player', ps.outcome),
          makeLogLine(f.turn, describeStrike(f.opponent.name, c.name, es), 'enemy', es.outcome),
        ];

        let reward = f.reward;
        let character = c;
        if (result.status !== 'active') {
          log.push(makeLogLine(f.turn, describeFinish(result.status, c.name, f.opponent.name), 'system'));
          const base = rewardFor(result.status, c.level, f.opponent.level, rng);
          // «Грамотей» даёт больше опыта.
          base.exp = Math.round(base.exp * deriveCharacter(c).expMult);
          const exp = c.exp + base.exp;
          const newLevel = levelForExp(exp);
          const levelsGained = newLevel - c.level;
          reward = { ...base, levelsGained };
          character = {
            ...c,
            exp,
            level: newLevel,
            kredits: c.kredits + base.kredits,
            freePoints: c.freePoints + levelsGained * POINTS_PER_LEVEL,
            hp: Math.max(0, result.playerHp),
            hpUpdatedAt: Date.now(),
            wins: c.wins + (result.status === 'won' ? 1 : 0),
            losses: c.losses + (result.status === 'lost' ? 1 : 0),
            draws: c.draws + (result.status === 'draw' ? 1 : 0),
          };
          if (levelsGained > 0) character.hp = deriveCharacter(character).maxHp;
          if (levelsGained > 0) log.push(makeLogLine(f.turn, `Уровень повышен! Теперь ${newLevel} уровень.`, 'system'));
          // Окно выбора умения на 2, 4, 6… уровнях.
          const picks = perkPicksBetween(c.level, newLevel);
          if (picks > 0) {
            character = {
              ...character,
              perkPicks: character.perkPicks + picks,
              perkChoices: character.perkChoices ?? offerPerks(character.perks as PerkId[], rng),
            };
            log.push(makeLogLine(f.turn, 'Новое умение! Выбери его на экране персонажа.', 'system'));
          }
          // Износ: каждый бой снимает по единице прочности со всего надетого.
          const worn = wearEquipment(character);
          character = worn.character;
          for (const item of worn.broke) log.push(makeLogLine(f.turn, `${item.name}: сломалось. Нужен кузнец.`, 'system'));
          // Задания пивной.
          get().track('fightPlay');
          if (result.status === 'won') get().track('fightWin');
          if (result.status === 'won' && f.opponent.level > c.level) get().track('fightWinStronger');
          // Травма: проигрыш и ничья могут оставить след. Тяжёлая вытесняет лёгкую.
          const rolled = rollInjury(result.status, rng);
          if (rolled) {
            const current = activeInjury(character);
            const injury = heavier(current, rolled);
            if (injury !== current) {
              character = { ...character, injury };
              log.push(makeLogLine(f.turn, `${injuryText(rolled)}. Пройдёт сама или вылечит лекарь.`, 'system'));
            }
          }
        }

        set({
          character,
          fight: {
            ...f,
            playerHp: result.playerHp,
            enemyHp: result.enemyHp,
            turn: f.turn + 1,
            status: result.status,
            log,
            playerMoves: [...f.playerMoves, move],
            lastEnemyMove: enemyMove,
            reward,
          },
        });
      },

      endFight: () => {
        const c = get().character;
        set({ fight: null, arena: c ? generateArena(c.level, rng) : [] });
      },

      startMining: (hours) => {
        const state = get();
        if (!state.character) return { ok: false, reason: 'Нет персонажа' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Сначала закончи бой' };
        if (state.mining) return { ok: false, reason: 'Ты уже в шахте' };
        if (!isShiftHours(hours)) return { ok: false, reason: 'Такой смены нет' };
        set({ mining: { startedAt: Date.now(), hours } });
        return { ok: true };
      },

      collectMining: () => {
        const { mining, character } = get();
        if (!mining || !character) return { ok: false, reason: 'Ты не в шахте' };
        const earned = mineEarnings(mining, mineRatePerHour(deriveCharacter(character)), Date.now());
        set({ mining: null, character: { ...character, kredits: character.kredits + earned } });
        get().track('mineHours', Math.floor(mineElapsedMs(mining, Date.now()) / 3_600_000));
        return { ok: true, kredits: earned };
      },

      repairItem: (itemUid) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const inv = c.backpack.find((i) => i.uid === itemUid);
        if (!inv) return { ok: false, reason: 'Предмет не найден' };
        const item = getItem(inv.itemId);
        const cost = repairCost(item, inv.durability);
        if (cost === 0) return { ok: false, reason: 'Вещь цела' };
        if (c.kredits < cost) return { ok: false, reason: `Нужно ${cost} кр.` };
        set({
          character: {
            ...c,
            kredits: c.kredits - cost,
            backpack: c.backpack.map((i) => (i.uid === itemUid ? { ...i, durability: maxDurability(item) } : i)),
          },
        });
        get().track('repair');
        return { ok: true, kredits: cost };
      },

      repairAll: () => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        let total = 0;
        const backpack = c.backpack.map((i) => {
          const item = getItem(i.itemId);
          const cost = repairCost(item, i.durability);
          if (cost === 0) return i;
          total += cost;
          return { ...i, durability: maxDurability(item) };
        });
        if (total === 0) return { ok: false, reason: 'Чинить нечего' };
        if (c.kredits < total) return { ok: false, reason: `На всё нужно ${total} кр.` };
        set({ character: { ...c, kredits: c.kredits - total, backpack } });
        get().track('repair');
        return { ok: true, kredits: total };
      },

      upgradeItem: (itemUid) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const inv = c.backpack.find((i) => i.uid === itemUid);
        if (!inv) return { ok: false, reason: 'Предмет не найден' };
        const item = getItem(inv.itemId);
        if (!canUpgrade(item)) return { ok: false, reason: 'Это не точится' };
        if (inv.upgrade >= UPGRADE_MAX) return { ok: false, reason: 'Дальше точить некуда' };
        if (inv.durability <= 0) return { ok: false, reason: 'Сначала почини' };
        const next = inv.upgrade + 1;
        const cost = upgradeCost(item, next);
        if (c.kredits < cost) return { ok: false, reason: `Нужно ${cost} кр.` };
        set({
          character: {
            ...c,
            kredits: c.kredits - cost,
            backpack: c.backpack.map((i) => (i.uid === itemUid ? { ...i, upgrade: next } : i)),
          },
        });
        get().track('sharpen');
        return { ok: true };
      },
    }),
    {
      name: 'combat-save-v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ character: s.character, fight: s.fight, arena: s.arena, mining: s.mining, quests: s.quests }),
      // Старые сейвы дописываем недостающими полями (прочность, заточка, будущие фичи).
      migrate: (persisted) => {
        const state = persisted as Partial<GameState>;
        return { ...state, character: state.character ? normalizeCharacter(state.character) : null };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.character) state.character = normalizeCharacter(state.character);
        state?.setHydrated();
      },
    },
  ),
);

/** Удобные селекторы. */
export const useCharacter = () => useGame((s) => s.character);
export const useFight = () => useGame((s) => s.fight);
