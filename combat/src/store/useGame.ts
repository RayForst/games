import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  applyRegen,
  canEquip,
  chooseEnemyMove,
  deriveCharacter,
  describeFinish,
  describeStrike,
  generateArena,
  getItem,
  healCost,
  isEquipped,
  levelForExp,
  makeLogLine,
  newCharacter,
  POINTS_PER_LEVEL,
  resolveTurn,
  rewardFor,
  sellPrice,
  toFighter,
  type Character,
  type Check,
  type FightState,
  type Move,
  type Opponent,
  type Slot,
  type StatKey,
  type Stats,
} from '@/game';

const rng = Math.random;

function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export interface GameState {
  character: Character | null;
  fight: FightState | null;
  arena: Opponent[];
  hydrated: boolean;

  setHydrated: () => void;
  createCharacter: (name: string, stats: Stats, freePoints: number) => void;
  resetGame: () => void;

  addStat: (stat: StatKey) => void;
  tick: () => void;
  heal: () => Check;

  buyItem: (itemId: string) => Check;
  sellItem: (itemUid: string) => Check;
  equip: (itemUid: string) => Check;
  unequip: (slot: Slot) => void;

  refreshArena: () => void;
  startFight: (opponentId: string) => Check;
  playTurn: (move: Move) => void;
  endFight: () => void;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      character: null,
      fight: null,
      arena: [],
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      createCharacter: (name, stats, freePoints) => {
        const character = newCharacter(name, stats, freePoints);
        set({ character, fight: null, arena: generateArena(character.level, rng) });
      },

      resetGame: () => set({ character: null, fight: null, arena: [] }),

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

      tick: () => {
        const c = get().character;
        if (!c || get().fight?.status === 'active') return;
        const next = applyRegen(c);
        if (next !== c) set({ character: next });
      },

      heal: () => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const maxHp = deriveCharacter(c).maxHp;
        if (c.hp >= maxHp) return { ok: false, reason: 'Ты и так здоров' };
        const cost = healCost(c);
        if (c.kredits < cost) return { ok: false, reason: `Нужно ${cost} кр.` };
        set({ character: { ...c, hp: maxHp, kredits: c.kredits - cost, hpUpdatedAt: Date.now() } });
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
            backpack: [...c.backpack, { uid: uid(), itemId }],
          },
        });
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
            kredits: c.kredits + sellPrice(item),
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
          log: [makeLogLine(0, `${fresh.name} против ${opponent.name}. Бой начался!`, 'system')],
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
    }),
    {
      name: 'combat-save-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ character: s.character, fight: s.fight, arena: s.arena }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/** Удобные селекторы. */
export const useCharacter = () => useGame((s) => s.character);
export const useFight = () => useGame((s) => s.fight);
