import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  ACHIEVEMENTS_BY_ID,
  activeInjury,
  applyQuestEvent,
  applyRegen,
  canEnterTournament,
  canEquip,
  handsConflict,
  prepareEquip,
  canTravel,
  canUpgrade,
  createTournament,
  dayKey,
  generateBoard,
  chooseEnemyMove,
  deriveCharacter,
  describeFinish,
  describeStrike,
  gatherRatePerHour,
  gatherYield,
  haulAfterAmbush,
  isGatherMinutes,
  isWild,
  POTION_HERBS,
  INJURY_BOGWORT,
  pickRival,
  rivalLine,
  rivalOpponent,
  RIVALS_BY_ID,
  rivalTaunt,
  oreForUpgrade,
  RELIC_RATING,
  relicPriceAtCastle,
  rollRoadEvent,
  wildOpponent,
  advanceSteps,
  firstSeen,
  newTutorial,
  normalizeTutorial,
  skipSteps,
  type Tutorial,
  type TutorialSnapshot,
  type SeenEvent,
  woodForRepair,
  generateArena,
  getItem,
  heavier,
  healAmount,
  isEquipped,
  isShiftHours,
  isTown,
  jobRatePerHour,
  CARAVAN_AMBUSH,
  ledgerAfterFight,
  levelForExp,
  makeLogLine,
  maxDurability,
  mineEarnings,
  mineElapsedMs,
  newCharacter,
  newInventoryItem,
  normalizeCharacter,
  // косметика
  authorCosmetics,
  buyCosmetic as buyCosmeticPure,
  canBuyCosmetic,
  equipCosmetic as equipCosmeticPure,
  unequipCosmetic as unequipCosmeticPure,
  sealPackPrice,
  SEAL_PACKS,
  sealsForAchievement,
  SEALS_FOR_TOURNAMENT,
  type CosmeticKind,
  offerPerks,
  perkPicksBetween,
  POINTS_PER_LEVEL,
  questDone,
  questReward,
  ratingDelta,
  repairCost,
  resolveTurn,
  rewardFor,
  rollInjury,
  rollLoot,
  rollAmbush,
  RESOURCES_BY_ID,
  ACTIVITIES_BY_ID,
  WILDS,
  injuryText,
  sellPrice,
  toFighter,
  TOURNAMENT_ROUNDS,
  tournamentPrize,
  upgradeCost,
  UPGRADE_MAX,
  wearEquipment,
  type Character,
  type Check,
  type FightState,
  type FightStatus,
  type LogLine,
  type Mining,
  type Move,
  type Opponent,
  type PerkId,
  type QuestBoard,
  type QuestEvent,
  type Reward,
  type Slot,
  type StatKey,
  type Stats,
  type Tournament,
  type Travel,
  type Gathering,
  type LocationId,
  type JobId,
  type ActivityId,
  type ResourceId,
  type Opponent as OpponentType,
  type WildId,
  travelDone,
  // чат
  ambientLine,
  appendMessage,
  cleanText,
  deliverPending,
  fightNews,
  fightRemark,
  isMuted,
  nextAmbientAt,
  normalizeChat,
  npcReplies,
  NPC_VOICES,
  validateMessage,
  WORLD_AUTHOR,
  emptyChat,
  type ChannelId,
  type ChatAuthor,
  type ChatState,
  // роли
  can,
  canSwitchRole,
  checkGmWord,
  newAccount,
  type Account,
  type Role,
  // гильдии
  addGuildEvent,
  addMember,
  canFoundGuild,
  canManage,
  canRecruitRival,
  canUpgradeGuild,
  dailyGuildUpdate,
  GUILD_FOUND_COST,
  guildLevelCost,
  guildPerks,
  guildRatingDelta,
  isLeader,
  joinCheck,
  newGuild,
  normalizeGuilds,
  recruitCost,
  removeMember,
  setRank,
  skirmishOpponent,
  skirmishPrize,
  validateGuildName,
  validateGuildTag,
  type Guild,
  type GuildEmblem,
  type GuildRank,
  expForLevel,
  normalizeGuild,
  // стороны и расы
  defect,
  defectCost,
  isValidOrigin,
  raceStats,
  RACES_BY_ID,
  SIDES_BY_ID,
  type Origin,
  type RaceId,
  type SideId,
  // война сторон
  newWar,
  normalizeWar,
  rollWarDay,
  simulateWar,
  warAfterFight,
  warKreditsMult,
  warRatingBonus,
  WAR_PLAYER_POINTS,
  WAR_RATING_BONUS,
  addWarPoints,
  type War,
  // столицы, склеп и рейды
  canTravelHome,
  TOWNS_BY_ID,
  townOf,
  townSmithyMult,
  townHealerMult,
  townJobMult,
  townPrice,
  CRYPT_BY_FLOOR,
  cryptAfterWin,
  cryptBones,
  cryptCleared,
  cryptOpponent,
  newCrypt,
  nextFloor,
  normalizeCrypt,
  type CryptState,
  canStartRaid,
  defenseNews,
  DEFENDER_TITLE,
  enemyRaidDueAt,
  enemyRaidNews,
  newRaid,
  newRaidLog,
  normalizeRaidLog,
  raidAfterFight,
  RAID_FIGHTS,
  RAID_GUILD_RATING,
  RAID_TITLE,
  RAID_WAR_EXTRA,
  raidLoot,
  raidNews,
  raidOpponent,
  rollEnemyRaid,
  type Raid,
  type RaidLog,
  bonesForRepair,
  POTION_BONES,
  // ежедневки, сундуки, события
  applyLoot,
  applyWeeklyEvent,
  arenaEventMult,
  CHESTS,
  claimDailyState,
  cureCostToday,
  DAILY_DAYS,
  SEALS_FOR_WEEK_STREAK,
  dailyRewind,
  eventMults,
  generateWeekly,
  giveChest,
  healPriceToday,
  marketPriceToday,
  newDaily,
  normalizeChests,
  normalizeDaily,
  openChest as openChestLoot,
  roadLoss,
  roadLossText,
  rollChestDrop,
  streakBonusMult,
  streakStepReached,
  weekKey,
  weeklyChest,
  weeklyDone,
  type ChestKind,
  type ChestLoot,
  type DailyState,
  type WeeklyBoard,
  type WeeklyEvent,
} from '@/game';

export interface MineResult extends Check {
  kredits?: number;
  /** Печати князя, если событие их даёт (достижения). */
  seals?: number;
}

export interface DailyClaimResult extends Check {
  /** Который день цепочки. */
  day?: number;
  loot?: ChestLoot[];
}

export interface ChestOpenResult extends Check {
  loot?: ChestLoot[];
}

export interface WeeklyClaimResult extends Check {
  chest?: ChestKind;
}

const rng = Math.random;

/** Стычек с чужими гильдиями в день. */
export const SKIRMISHES_PER_DAY = 3;

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
  /** Турнир в замке (сегодняшний). */
  tournament: Tournament | null;
  /** Откуда был последний бой — туда возвращается экран боя. */
  lastFightContext: 'arena' | 'tournament' | 'forest' | 'guild';
  /** Путь между локациями. */
  travel: Travel | null;
  /** Сбор в лесу. */
  gathering: Gathering | null;
  /** Улов (или плата за караван), за который идёт бой с засадой. */
  pendingHaul: { resource: ResourceId | 'kredits'; amount: number } | null;
  /** Что случилось по дороге — показать по прибытии. */
  roadNews: string | null;
  /** Служебная учётка: роль и открыт ли служебный вход. */
  account: Account;
  /** Чат: лента, отложенные ответы, заткнутые. */
  chat: ChatState;
  /** Когда игрок последний раз открывал чат — для счётчика непрочитанного. */
  chatSeenAt: number;
  /** Гильдия игрока (своя или местных, куда вступил). */
  guild: Guild | null;
  /** Гильдии местных, с которыми соревнуемся и дерёмся. */
  npcGuilds: Guild[];
  /** Идущая стычка: с какой гильдией. */
  skirmish: { guildId: string } | null;
  /** Стычек сегодня. */
  skirmishes: { day: string; count: number } | null;
  /** Настройки игрока. */
  settings: { sound: boolean };
  /** Обучение новичка: текущий шаг и показанные пояснения. */
  tutorial: Tutorial;
  /** Война сторон: дневной счёт Короны и Вольницы. */
  war: War | null;
  /** Склеп: сколько ярусов пройдено сегодня. */
  crypt: CryptState | null;
  /** Текущий (или последний сегодняшний) рейд на чужую столицу. */
  raid: Raid | null;
  /** Журнал рейдов: лимит в день, ответные рейды, оборона. */
  raids: RaidLog;
  /** Ежедневки: награда за вход и недельные цели. Сундуки лежат в персонаже (`character.chests`). */
  daily: DailyState;
  hydrated: boolean;

  setHydrated: () => void;
  /** Новый персонаж: `stats` без расового +1, его добавит стор. */
  createCharacter: (name: string, stats: Stats, freePoints: number, origin?: Origin) => void;
  /** Перебежчик: сменить сторону и расу у князя. Первый раз бесплатно, дальше за кредиты. */
  defectTo: (side: SideId, race: RaceId) => MineResult;
  resetGame: () => void;

  addStat: (stat: StatKey) => void;
  /** Выбрать умение из текущего предложения. */
  choosePerk: (id: PerkId) => Check;
  tick: () => void;
  /** Лечение у лекаря: доля максимального hp (зелья 0.3 / 0.6 / 1), за кредиты или за травы. */
  heal: (fraction?: number, pay?: 'kredits' | 'herbs' | 'bones') => Check;
  /** Снять травму у лекаря: за кредиты или за болотник. */
  cureInjury: (pay?: 'kredits' | 'bogwort') => MineResult;

  buyItem: (itemId: string) => Check;
  sellItem: (itemUid: string) => Check;
  equip: (itemUid: string) => Check;
  unequip: (slot: Slot) => void;

  refreshArena: () => void;
  startFight: (opponentId: string) => Check;
  playTurn: (move: Move) => void;
  /** Сдаться: засчитывается как поражение. */
  surrender: () => void;
  endFight: () => void;

  /** Шахта в Городе или караван в Броде. */
  startMining: (hours: number, job?: JobId) => Check;
  collectMining: () => MineResult;

  /** Кузница. */
  repairItem: (itemUid: string) => MineResult;
  /** Починить всё за кредиты или за дрова. */
  repairAll: (pay?: 'kredits' | 'wood' | 'bones') => MineResult;
  /** Заточить за кредиты или за руду. */
  upgradeItem: (itemUid: string, pay?: 'kredits' | 'ore') => Check;

  /** Пивная: доска на сегодня (пересоздаётся на новый день), прогресс и награда. */
  ensureQuests: () => QuestBoard | null;
  track: (event: QuestEvent, amount?: number) => void;
  claimQuest: (questId: string) => MineResult;

  /** Замок: начать турнир и выйти на очередной бой. */
  startTournament: () => Check;
  startTournamentFight: () => Check;

  /** Забрать награду за выполненное достижение. */
  claimAchievement: (id: string) => MineResult;

  /** Карта мира. */
  startTravel: (to: LocationId) => Check;
  /** Лес. */
  startGathering: (activity: ActivityId, minutes: number) => Check;
  collectGathering: () => GatherResult;
  sellResource: (resource: ResourceId, amount?: number) => MineResult;
  /** Сдать реликвии князю: вдвое дороже лавки и рейтинг. */
  sellRelics: () => MineResult;
  dismissRoadNews: () => void;

  /** Чат. */
  sendChat: (channel: ChannelId, text: string) => Check;
  markChatSeen: () => void;
  /** Смотрящий: удалить сообщение, заткнуть или вернуть голос автору. */
  deleteChatMessage: (id: string) => Check;
  muteAuthor: (authorId: string) => Check;
  unmuteAuthor: (authorId: string) => Check;
  /** Мастер: сказать от имени мира. */
  gmBroadcast: (channel: ChannelId, text: string) => Check;

  /** Гильдии. */
  foundGuild: (name: string, tag: string, emblem: GuildEmblem, motto?: string) => Check;
  joinGuild: (guildId: string) => Check;
  leaveGuild: () => Check;
  disbandGuild: () => Check;
  setGuildMotto: (motto: string) => Check;
  /** Позвать именного соперника: за стол платит игрок. */
  inviteRival: (rivalId: string) => MineResult;
  kickMember: (memberId: string) => Check;
  setMemberRank: (memberId: string, rank: GuildRank) => Check;
  donateGuild: (amount: number) => Check;
  upgradeGuild: () => Check;
  /** Стычка с бойцом чужой гильдии. */
  startSkirmish: (guildId: string) => Check;

  /** Служебный вход и роли. */
  unlockGm: (word: string) => Check;
  lockGm: () => void;
  setRole: (role: Role) => Check;
  /** Мастер игры: выдать, вылечить, перенести, завершить таймеры, новый день. */
  gmGive: (what: 'kredits' | 'exp' | 'resources', amount: number) => Check;
  gmSetLevel: (level: number) => Check;
  gmHeal: () => Check;
  gmGiveItem: (itemId: string) => Check;
  gmTeleport: (to: LocationId) => Check;
  gmFinishTimers: () => Check;
  gmNewDay: () => Check;
  gmEditGuild: (guildId: string, patch: Partial<Pick<Guild, 'name' | 'tag' | 'motto' | 'level' | 'treasury' | 'rating'>>) => Check;
  gmDisbandGuild: (guildId: string) => Check;
  gmResetSave: () => Check;

  setSound: (on: boolean) => void;

  // --- Ежедневки, сундуки, события ---
  /** Забрать награду за вход (раз в день, цепочка из семи). */
  claimDaily: () => DailyClaimResult;
  /** Недельные цели: доска на неделю (пересоздаётся в понедельник), прогресс, сундук за выполненную. */
  ensureWeekly: () => WeeklyBoard | null;
  trackWeekly: (event: WeeklyEvent, amount?: number) => void;
  claimWeekly: (goalId: string) => WeeklyClaimResult;
  /** Открыть сундук: содержимое сразу в персонажа, список строк — на экран. */
  openChest: (kind: ChestKind) => ChestOpenResult;
  // --- Косметика (Лавка князя) ---
  buyCosmetic: (id: string) => Check;
  equipCosmetic: (id: string) => Check;
  unequipCosmetic: (kind: CosmeticKind) => Check;
  /** Обмен кредитов на печати по курсу лавки (пачки из `SEAL_PACKS`). */
  buySeals: (seals: number) => Check;
  /** Начислить печати за событие вне лавки (ежедневки: 7-й день входа). */
  grantSeals: (amount: number) => Check;
  gmGiveSeals: (amount: number) => Check;

  /** Обучение: закрыть сделанные шаги (force — кнопка «Понял»), пропустить целиком. */
  advanceTutorial: (extras?: Pick<TutorialSnapshot, 'attackChosen' | 'blockChosen' | 'tavernVisited'>, force?: boolean) => void;
  skipTutorial: () => void;

  // --- Склеп и рейды ---
  /** Домой одним переходом по кратчайшей дороге (родной город открыт всегда). */
  travelHome: () => Check;
  /** Склеп: бой за следующий ярус. */
  startCryptFight: () => Check;
  /** Рейд: выйти с нижнего яруса в чужую столицу и выйти на первый бой. */
  startRaid: () => Check;
  startRaidFight: () => Check;
  /** Бросить рейд и уйти под землю: засчитывается как проигранный. */
  abandonRaid: () => Check;
  /** Отбить ответный рейд чужих у своих ворот. */
  startDefense: () => Check;
  dismissDefense: () => void;
}

export interface GatherResult extends Check {
  resource?: ResourceId;
  amount?: number;
  /** Засада: начат бой, улов решится по его итогу. */
  ambush?: boolean;
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      /**
       * Завершение боя: награда и уровень, умения, износ вещей, рейтинг, турнир, задания, травма.
       * Общий хвост для обычного конца раунда и для «Сдаться». Турнир обновляется через set,
       * персонаж и лог возвращаются вызывающему.
       */
      /** Пояснение события боя при первом появлении: строка в лог и отметка в обучении. */
      const explainOnce = (event: SeenEvent, log: LogLine[], turn: number) => {
        const r = firstSeen(get().tutorial, event);
        if (!r) return;
        set({ tutorial: r.tutorial });
        log.push(makeLogLine(turn, r.text, 'system'));
      };

      const settle = (c: Character, f: FightState, status: FightStatus): { character: Character; reward: Reward; log: LogLine[] } => {
        const log = [...f.log];
        const turn = f.turn;
        const base = rewardFor(status, c.level, f.opponent.level, rng);
        // Арена Брода платит больше (множитель города из `TOWNS`; рейд платит добычей, не ареной).
        const venueMult = f.venue && f.context !== 'raid' ? (TOWNS_BY_ID[f.venue]?.arenaMult ?? 1) : 1;
        if (venueMult !== 1) {
          base.kredits = Math.round(base.kredits * venueMult);
          base.exp = Math.round(base.exp * venueMult);
        }
        // «Грамотей» и расовая «Выучка» дают больше опыта.
        base.exp = Math.round(base.exp * deriveCharacter(c).expMult);
        // Война сторон: вчерашний победитель сегодня получает надбавку к кредитам.
        const warMult = warKreditsMult(get().war, c.side);
        if (warMult > 1) base.kredits = Math.round(base.kredits * warMult);
        // Гильдия со 2-го уровня добавляет опыта, с 3-го — кредитов.
        const guildNow = get().guild;
        if (guildNow) {
          const gp = guildPerks(guildNow.level);
          base.exp = Math.round(base.exp * gp.expMult);
          base.kredits = Math.round(base.kredits * gp.kreditsMult);
        }
        // --- Ежедневки, сундуки, события: событие дня и серия побед ---
        const evMults = eventMults();
        const evArena = f.context === 'arena' ? arenaEventMult(c.side, f.opponent.side, status) : 1;
        if (evArena > 1) {
          base.kredits = Math.round(base.kredits * evArena);
          log.push(makeLogLine(turn, `Набор в стражу: за битого вольного Хозяин доплатил из княжьей казны (×${evArena}).`, 'system'));
        }
        const streakNow = status === 'won' ? c.ledger.streak + 1 : 0;
        const streakMult = streakBonusMult(streakNow);
        if (streakMult > 1) base.kredits = Math.round(base.kredits * streakMult);
        if (streakStepReached(streakNow)) log.push(makeLogLine(turn, `Серия: ${streakNow} побед подряд. Награда за победы ×${streakMult}, пока не упадёшь.`, 'system'));
        const exp = c.exp + base.exp;
        const newLevel = Math.max(c.level, levelForExp(exp));
        const levelsGained = newLevel - c.level;
        let reward: Reward = { ...base, levelsGained };
        let character: Character = {
          ...c,
          exp,
          level: newLevel,
          kredits: c.kredits + base.kredits,
          freePoints: c.freePoints + levelsGained * POINTS_PER_LEVEL,
          hp: Math.max(0, f.playerHp),
          hpUpdatedAt: Date.now(),
          wins: c.wins + (status === 'won' ? 1 : 0),
          losses: c.losses + (status === 'lost' ? 1 : 0),
          draws: c.draws + (status === 'draw' ? 1 : 0),
          ledger: { ...ledgerAfterFight(c.ledger, status === 'won'), kreditsEarned: c.ledger.kreditsEarned + base.kredits },
        };
        if (levelsGained > 0) character.hp = deriveCharacter(character).maxHp;
        if (levelsGained > 0) log.push(makeLogLine(turn, `Уровень повышен! Теперь ${newLevel} уровень.`, 'system'));
        // Окно выбора умения на 2, 4, 6… уровнях.
        const picks = perkPicksBetween(c.level, newLevel);
        if (picks > 0) {
          character = {
            ...character,
            perkPicks: character.perkPicks + picks,
            perkChoices: character.perkChoices ?? offerPerks(character.perks as PerkId[], rng),
          };
          log.push(makeLogLine(turn, 'Новое умение! Выбери его на экране персонажа.', 'system'));
        }
        // Износ: каждый бой снимает по единице прочности со всего надетого.
        const worn = wearEquipment(character);
        character = worn.character;
        for (const item of worn.broke) log.push(makeLogLine(turn, `${item.name}: сломалось. Нужен кузнец.`, 'system'));
        if (worn.broke.length > 0) explainOnce('broke', log, turn);
        // Рейтинг: за каждый бой, турнирные вдвое.
        const inTournament = f.context === 'tournament';
        const warRating = warRatingBonus(c.side, f.opponent.side, status);
        const delta = ratingDelta(status, c.level, f.opponent.level, inTournament) + warRating;
        character = { ...character, rating: Math.max(0, character.rating + delta) };
        reward = { ...reward, rating: delta };
        // Война сторон: бой с чужой стороной двигает дневной счёт.
        if (f.opponent.side && f.opponent.side !== c.side && status !== 'draw') {
          const war = get().war;
          if (war) set({ war: warAfterFight(war, c.side, f.opponent.side, status) });
          log.push(
            makeLogLine(
              turn,
              status === 'won'
                ? `${SIDES_BY_ID[f.opponent.side].name} бита: +${WAR_PLAYER_POINTS} очка ${SIDES_BY_ID[c.side].dative} в войне сторон, +${WAR_RATING_BONUS} рейтинга.`
                : `${SIDES_BY_ID[f.opponent.side].name} записала себе +${WAR_PLAYER_POINTS} очка в войне сторон.`,
              'system',
            ),
          );
        }
        // Турнир: победа ведёт к следующему бою, финал даёт приз, поражение выбивает.
        const t = get().tournament;
        if (inTournament && t && t.status === 'active') {
          if (status === 'won') {
            const stage = t.stage + 1;
            if (stage >= TOURNAMENT_ROUNDS) {
              const prize = tournamentPrize(c.level);
              const exp2 = character.exp + prize.exp;
              const lvl2 = Math.max(character.level, levelForExp(exp2));
              const gained2 = lvl2 - character.level;
              character = {
                ...character,
                exp: exp2,
                level: lvl2,
                freePoints: character.freePoints + gained2 * POINTS_PER_LEVEL,
                kredits: character.kredits + prize.kredits,
                seals: character.seals + SEALS_FOR_TOURNAMENT,
                titles: character.titles.includes(prize.title) ? character.titles : [...character.titles, prize.title],
                ledger: {
                  ...character.ledger,
                  tournamentsWon: character.ledger.tournamentsWon + 1,
                  kreditsEarned: character.ledger.kreditsEarned + prize.kredits,
                },
              };
              reward = { ...reward, exp: reward.exp + prize.exp, kredits: reward.kredits + prize.kredits, title: prize.title };
              log.push(makeLogLine(turn, `Турнир выигран! Князь жалует ${prize.kredits} кр., титул «${prize.title}» и ${SEALS_FOR_TOURNAMENT} печатей для лавки.`, 'system'));
              set({ tournament: { ...t, stage, status: 'won' } });
            } else {
              log.push(makeLogLine(turn, `Бой ${stage} из ${TOURNAMENT_ROUNDS} за тобой. Следующий ждёт.`, 'system'));
              set({ tournament: { ...t, stage } });
            }
          } else {
            log.push(makeLogLine(turn, 'Турнир окончен. Приходи завтра.', 'system'));
            set({ tournament: { ...t, status: 'lost' } });
          }
        }
        // Засада в лесу: улов зависит от исхода.
        const haul = get().pendingHaul;
        if (f.context === 'forest' && haul) {
          const amount = haulAfterAmbush(haul.amount, status === 'won');
          const res = haul.resource;
          if (res === 'kredits') {
            character = { ...character, kredits: character.kredits + amount, ledger: { ...character.ledger, kreditsEarned: character.ledger.kreditsEarned + amount } };
            log.push(makeLogLine(turn, status === 'won' ? `Караван дошёл. Купцы доплатили за храбрость: +${amount} кр.` : `Половину товара растащили. Купцы заплатили ${amount} кр. и то со скрипом.`, 'system'));
          } else {
            character = { ...character, resources: { ...character.resources, [res]: character.resources[res] + amount } };
            get().track('gather', amount);
            log.push(
              makeLogLine(
                turn,
                status === 'won'
                  ? `Отбился. ${RESOURCES_BY_ID[res].name.toLowerCase()}: ${amount} шт., с добавкой.`
                  : `Половину улова пришлось бросить. ${RESOURCES_BY_ID[res].name}: ${amount} шт.`,
                'system',
              ),
            );
          }
          set({ pendingHaul: null });
        }
        // --- Склеп и рейды ---
        // Склеп: победа — ярус пройден и кости в мешок; поражение — ярус остался за нежитью.
        if (f.context === 'crypt' && f.cryptFloor) {
          if (status === 'won') {
            const bones = cryptBones(f.cryptFloor, rng);
            character = { ...character, resources: { ...character.resources, bones: character.resources.bones + bones } };
            const crypt = cryptAfterWin(normalizeCrypt(get().crypt, dayKey()), f.cryptFloor);
            set({ crypt });
            log.push(makeLogLine(turn, `Ярус ${f.cryptFloor} пройден. Костей в мешок: +${bones}.${cryptCleared(crypt) ? ' Дальше — нижний ход: сверху слышен чужой город.' : ''}`, 'system'));
            get().track('gather', bones);
          } else {
            log.push(makeLogLine(turn, 'Нежить не пустила ниже. Ярус остался за ней, попробуй ещё.', 'system'));
          }
        }
        // Рейд: добыча за каждую победу, очки войны сверх обычных, слава гильдии; три победы — полный рейд и титул.
        if (f.context === 'raid') {
          const raid = get().raid;
          const defense = get().raids.defense;
          const warNow = get().war;
          const own = raid && raid.status === 'active' && f.venue === raid.target;
          if (own) {
            const loot = status === 'won' ? raidLoot(f.opponent.level) : 0;
            const next = raidAfterFight(raid, status, loot);
            if (loot > 0) {
              character = { ...character, kredits: character.kredits + loot, ledger: { ...character.ledger, kreditsEarned: character.ledger.kreditsEarned + loot } };
              reward = { ...reward, kredits: reward.kredits + loot };
              log.push(makeLogLine(turn, `Добыча: +${loot} кр. с ${f.opponent.name}.`, 'system'));
            }
            if (status === 'won') {
              if (warNow) set({ war: addWarPoints(warNow, c.side, RAID_WAR_EXTRA) });
              log.push(makeLogLine(turn, `Рейд: ещё +${RAID_WAR_EXTRA} очка ${SIDES_BY_ID[c.side].dative} сверх обычных.`, 'system'));
            }
            let raids = get().raids;
            if (next.status === 'won') {
              if (!character.titles.includes(RAID_TITLE)) character = { ...character, titles: [...character.titles, RAID_TITLE] };
              reward = { ...reward, title: RAID_TITLE };
              raids = { ...raids, won: raids.won + 1 };
              log.push(makeLogLine(turn, `Полный рейд: трое легли, ${TOWNS_BY_ID[raid.target].name} запомнит. Титул «${RAID_TITLE}». Пора под землю.`, 'system'));
              worldSays('tavern', raidNews(c.name, c.side, raid.target, next.kills, 'won'));
            } else if (next.status === 'lost') {
              log.push(makeLogLine(turn, `Тебя вынесли обратно в склеп. Рейд окончен: уложил ${next.kills} из ${RAID_FIGHTS}.`, 'system'));
              worldSays('tavern', raidNews(c.name, c.side, raid.target, next.kills, 'lost'));
            } else {
              log.push(makeLogLine(turn, `Бой ${next.stage} из ${RAID_FIGHTS} за тобой. Следующий уже бежит с улицы.`, 'system'));
            }
            set({ raid: next, raids });
          } else if (defense && f.opponent.id === defense.opponent.id) {
            // Оборона своих ворот от ответного рейда.
            let raids = get().raids;
            if (status === 'won') {
              const loot = Math.round(raidLoot(f.opponent.level) / 2);
              character = { ...character, kredits: character.kredits + loot, ledger: { ...character.ledger, kreditsEarned: character.ledger.kreditsEarned + loot } };
              reward = { ...reward, kredits: reward.kredits + loot };
              if (warNow) set({ war: addWarPoints(warNow, c.side, RAID_WAR_EXTRA) });
              if (!character.titles.includes(DEFENDER_TITLE)) {
                character = { ...character, titles: [...character.titles, DEFENDER_TITLE] };
                reward = { ...reward, title: DEFENDER_TITLE };
              }
              raids = { ...raids, defended: raids.defended + 1 };
              log.push(makeLogLine(turn, `Налёт отбит. С налётчика сняли ${loot} кр., ${SIDES_BY_ID[c.side].dative} ещё +${RAID_WAR_EXTRA} очка.`, 'system'));
              worldSays('tavern', `${c.name} отбил налёт у ворот: ${f.opponent.name} ушёл под землю ни с чем.`);
            } else {
              log.push(makeLogLine(turn, 'Налётчик прошёл через тебя и ушёл с добычей. Ворота запомнили.', 'system'));
              worldSays('tavern', `${f.opponent.name} прошёл через ${c.name} у ворот и ушёл в склеп с добычей.`);
            }
            set({ raids: { ...raids, defense: null } });
          }
        }
        // Гильдия: слава за победу в рейде сверх обычной.
        if (f.context === 'raid' && status === 'won' && guildNow) set({ guild: { ...get().guild!, rating: get().guild!.rating + RAID_GUILD_RATING } });
        // Именной соперник: счёт и реплика после боя.
        const rival = f.opponent.rivalId ? RIVALS_BY_ID[f.opponent.rivalId] : null;
        if (rival && status !== 'draw') {
          const rec = character.rivals[rival.id] ?? { wins: 0, losses: 0 };
          character = {
            ...character,
            rivals: { ...character.rivals, [rival.id]: { wins: rec.wins + (status === 'won' ? 1 : 0), losses: rec.losses + (status === 'lost' ? 1 : 0) } },
          };
          log.push(makeLogLine(turn, rivalLine(rival, status === 'won', rng), 'system'));
        }
        // Трофей: с побеждённого иногда удаётся снять вещь.
        if (status === 'won') {
          const loot = rollLoot(f.opponent, rng, uid(), evMults.lootMult);
          if (loot) {
            const def = getItem(loot.itemId);
            character = { ...character, backpack: [...character.backpack, loot] };
            reward = { ...reward, loot: def.name };
            log.push(makeLogLine(turn, `Трофей: ${def.name}. Снял с ${f.opponent.name}, теперь в рюкзаке.`, 'system'));
          }
          // Сундук с побеждённого: редко, в ночь воров вдвое чаще. Открывается в календаре.
          const chest = rollChestDrop(rng, evMults.chestMult);
          if (chest) {
            character = giveChest(character, chest);
            log.push(makeLogLine(turn, `${CHESTS[chest].name}: нашёлся при ${f.opponent.name}. Открыть можно в календаре.`, 'system'));
          }
        }
        // Задания пивной.
        get().track('fightPlay');
        if (status === 'won') get().track('fightWin');
        if (status === 'won' && f.opponent.level > c.level) get().track('fightWinStronger');
        if (f.context === 'guild') get().trackWeekly('skirmish');
        // Травма: проигрыш и ничья могут оставить след. Тяжёлая вытесняет лёгкую.
        // В чуму травмы чаще: второй бросок, если первый прошёл мимо.
        const rolled = rollInjury(status, rng, Date.now(), deriveCharacter(c).injuryMult) ?? (evMults.injuryExtraRoll ? rollInjury(status, rng, Date.now(), deriveCharacter(c).injuryMult) : null);
        if (rolled) {
          const current = activeInjury(character);
          const injury = heavier(current, rolled);
          if (injury !== current) {
            character = { ...character, injury };
            log.push(makeLogLine(turn, `${injuryText(rolled)}. Пройдёт сама или вылечит лекарь.`, 'system'));
            explainOnce('injury', log, turn);
          }
        }

        // Гильдия: слава за каждый бой члена, стычка — вчетверо и с призом в казну.
        if (guildNow) {
          const skirmish = f.context === 'guild' ? get().skirmish : null;
          const enemyGuild = skirmish ? get().npcGuilds.find((g) => g.id === skirmish.guildId) : null;
          let g: Guild = { ...guildNow, rating: Math.max(0, guildNow.rating + guildRatingDelta(status, !!skirmish)) };
          if (skirmish && enemyGuild) {
            const prize = skirmishPrize(status, enemyGuild.level);
            g = { ...g, treasury: g.treasury + prize.treasury };
            if (prize.kredits > 0) {
              character = { ...character, kredits: character.kredits + prize.kredits, ledger: { ...character.ledger, kreditsEarned: character.ledger.kreditsEarned + prize.kredits } };
              reward = { ...reward, kredits: reward.kredits + prize.kredits };
            }
            g = addGuildEvent(
              g,
              status === 'won'
                ? `${c.name} побил ${f.opponent.name} из «${enemyGuild.name}»: +${prize.treasury} кр. в казну.`
                : status === 'draw'
                  ? `${c.name} разошёлся вничью с ${f.opponent.name} из «${enemyGuild.name}».`
                  : `${c.name} уступил ${f.opponent.name} из «${enemyGuild.name}».`,
            );
            log.push(makeLogLine(turn, status === 'won' ? `Стычка выиграна: ${prize.kredits} кр. тебе, ${prize.treasury} кр. в казну гильдии.` : status === 'draw' ? `Стычка вничью: ${prize.treasury} кр. в казну за старание.` : 'Стычка проиграна. Гильдия запомнит.', 'system'));
            // Чужая гильдия тоже считает славу.
            set({
              skirmish: null,
              npcGuilds: get().npcGuilds.map((x) => (x.id === enemyGuild.id ? { ...x, rating: Math.max(0, x.rating + guildRatingDelta(status === 'won' ? 'lost' : status === 'lost' ? 'won' : 'draw', true)) } : x)),
            });
          }
          set({ guild: g });
        }
        // Сводка боя уходит в канал «Арена», иногда с комментарием завсегдатая.
        {
          const venue = f.context === 'tournament' ? 'tournament' : f.context === 'forest' ? 'wild' : f.context === 'crypt' ? 'crypt' : f.context === 'raid' ? 'raid' : (f.venue ?? 'city');
          const now = Date.now();
          let chat = appendMessage(get().chat, { id: uid(), channel: 'arena', at: now, author: WORLD_AUTHOR, text: fightNews(c.name, f.opponent.name, status, turn, venue), kind: 'system' });
          if (rng() < 0.3) {
            const voice = NPC_VOICES[Math.floor(rng() * NPC_VOICES.length)];
            chat = { ...chat, pending: [...chat.pending, { at: now + 4_000 + Math.floor(rng() * 8_000), channel: 'arena', author: { id: `npc:${voice.id}`, name: voice.name }, text: fightRemark(c.name, status, rng) }] };
          }
          set({ chat });
        }

      return { character, reward, log };
      };

      /** Автор-игрок для чата: имя с тегом гильдии и служебной ролью. */
      const me = (c: Character): ChatAuthor => ({ id: 'player', name: c.name, tag: get().guild?.tag ?? null, role: get().account.role, side: c.side, cosmetics: authorCosmetics(c) });

      /** Прибавить опыт с ростом уровня (уровень не падает), очками и окном умений. */
      const withExp = (c: Character, amount: number): Character => {
        const exp = c.exp + amount;
        const level = Math.max(c.level, levelForExp(exp));
        const gained = level - c.level;
        const picks = perkPicksBetween(c.level, level);
        return {
          ...c,
          exp,
          level,
          freePoints: c.freePoints + gained * POINTS_PER_LEVEL,
          perkPicks: c.perkPicks + picks,
          perkChoices: picks > 0 ? (c.perkChoices ?? offerPerks(c.perks as PerkId[], rng)) : c.perkChoices,
        };
      };

      const worldSays = (channel: ChannelId, text: string) => {
        set({ chat: appendMessage(get().chat, { id: uid(), channel, at: Date.now(), author: WORLD_AUTHOR, text, kind: 'system' }) });
      };

      const need = (permission: Parameters<typeof can>[1]): Check =>
        can(get().account.role, permission) ? { ok: true } : { ok: false, reason: 'Нет прав. Нужен служебный вход.' };

      /** Зал по данным города: в Городе именной соперник первым, в Броде все на уровень выше и без знакомых лиц. */
      const newArena = (c: Character): Opponent[] => {
        const town = townOf(c.location);
        if (!town) return generateArena(c.level, rng);
        return town.rivals ? generateArena(c.level, rng, rivalOpponent(pickRival(c, rng), c.level, rng)) : generateArena(c.level + town.arenaLevelBonus, rng);
      };

      return {
      character: null,
      fight: null,
      arena: [],
      mining: null,
      quests: null,
      tournament: null,
      lastFightContext: 'arena',
      travel: null,
      gathering: null,
      pendingHaul: null,
      roadNews: null,
      account: newAccount(),
      chat: emptyChat(),
      chatSeenAt: 0,
      guild: null,
      npcGuilds: normalizeGuilds(undefined),
      skirmish: null,
      skirmishes: null,
      settings: { sound: true },
      tutorial: newTutorial(),
      war: null,
      crypt: null,
      raid: null,
      raids: newRaidLog(),
      daily: newDaily(),
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      createCharacter: (name, stats, freePoints, origin) => {
        const o: Origin = origin && isValidOrigin(origin.side, origin.race) ? origin : { side: 'crown', race: 'human' };
        const character = newCharacter(name, raceStats(stats, o.race), freePoints, Date.now(), o);
        set({
          character,
          war: get().war ?? newWar(dayKey()),
          fight: null,
          mining: null,
          quests: null,
          tournament: null,
          travel: null,
          gathering: null,
          pendingHaul: null,
          arena: newArena(character),
          chat: emptyChat(),
          chatSeenAt: 0,
          guild: null,
          npcGuilds: normalizeGuilds(undefined),
          skirmish: null,
          skirmishes: null,
          tutorial: newTutorial(),
          crypt: null,
          raid: null,
          raids: newRaidLog(),
          daily: newDaily(),
        });
        get().sendChat('tavern', 'Здарова всем. Я тут новенький.');
      },

      defectTo: (side, race) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (get().fight?.status === 'active') return { ok: false, reason: 'Не во время боя' };
        if (!isValidOrigin(side, race)) return { ok: false, reason: 'Такой расы на этой стороне нет' };
        if (c.side === side && c.race === race) return { ok: false, reason: 'Ты и так оттуда' };
        const g = get().guild;
        if (g && g.side !== side) return { ok: false, reason: 'Сначала выйди из гильдии: она за другую сторону' };
        const cost = defectCost(c.defections);
        if (c.kredits < cost) return { ok: false, reason: `Князь берёт за это ${cost} кр.` };
        const switched = defect(c, side, race);
        const next: Character = {
          ...switched,
          kredits: switched.kredits - cost,
          ledger: { ...switched.ledger, kreditsSpent: switched.ledger.kreditsSpent + cost },
        };
        next.hp = Math.min(next.hp, deriveCharacter(next).maxHp);
        set({ character: next, arena: newArena(next) });
        const raceName = RACES_BY_ID[race].genitive;
        worldSays(
          'tavern',
          c.side !== side
            ? `${c.name} перебежал: теперь за ${SIDES_BY_ID[side].accusative}, из ${raceName}. ${cost > 0 ? `Князь взял ${cost} кр.` : 'Князь простил. В первый раз.'}`
            : `${c.name} теперь из ${raceName}. Бумаги у князя, деньги — тоже.`,
        );
        return { ok: true, kredits: cost };
      },

      resetGame: () =>
        set({ character: null, fight: null, mining: null, quests: null, tournament: null, travel: null, gathering: null, pendingHaul: null, arena: [], chat: emptyChat(), chatSeenAt: 0, guild: null, npcGuilds: normalizeGuilds(undefined), skirmish: null, skirmishes: null, tutorial: newTutorial(), daily: newDaily(), crypt: null, raid: null, raids: newRaidLog() }),

      ensureQuests: () => {
        const { character, quests } = get();
        if (!character) return null;
        if (quests && quests.day === dayKey()) return quests;
        const board = generateBoard(rng);
        set({ quests: board });
        return board;
      },

      track: (event, amount = 1) => {
        get().trackWeekly(event, amount);
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
        const newLevel = Math.max(c.level, levelForExp(exp));
        const levelsGained = newLevel - c.level;
        const character: Character = {
          ...c,
          kredits: c.kredits + reward.kredits,
          exp,
          level: newLevel,
          freePoints: c.freePoints + levelsGained * POINTS_PER_LEVEL,
          ledger: { ...c.ledger, kreditsEarned: c.ledger.kreditsEarned + reward.kredits },
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
        // Дорога пройдена — персонаж на месте.
        const t = get().travel;
        if (t && travelDone(t, Date.now())) {
          next = { ...next, location: t.to };
          const event = rollRoadEvent(next.level, rng);
          if (event) {
            if (event.kredits) next = { ...next, kredits: Math.max(0, next.kredits + event.kredits) };
            if (event.resource) next = { ...next, resources: { ...next.resources, [event.resource.id]: next.resources[event.resource.id] + event.resource.amount } };
          }
          // Ночь воров: по дороге могут срезать кошель.
          let news = event?.text ?? null;
          const lost = roadLoss(next.kredits, rng);
          if (lost > 0) {
            next = { ...next, kredits: next.kredits - lost };
            news = roadLossText(lost, rng);
          }
          set({ travel: null, roadNews: news, arena: newArena(next) });
        }
        if (next !== c) set({ character: next });
        // Чат: созревшие ответы и болтовня завсегдатаев без повода.
        const now = Date.now();
        let chat = deliverPending(get().chat, now, uid);
        if (now >= chat.nextAmbientAt) {
          chat = { ...chat, pending: [...chat.pending, ambientLine(rng, now)], nextAmbientAt: nextAmbientAt(rng, now) };
        }
        if (chat !== get().chat) set({ chat });
        // Война сторон: новый день — вчерашний лидер получает бонус; бои местных досчитываются по времени.
        const day = dayKey(now);
        {
          const war = simulateWar(rollWarDay(get().war, day, now), now, rng);
          if (war !== get().war) set({ war });
        }
        // Гильдии: дневные взносы и дрейф таблицы.
        const g = get().guild;
        if (g && g.lastDay !== day) set({ guild: dailyGuildUpdate(g, day, rng, now) });
        if (get().npcGuilds.some((x) => x.lastDay !== day)) set({ npcGuilds: get().npcGuilds.map((x) => dailyGuildUpdate(x, day, rng, now)) });
        // --- Склеп и рейды ---
        // В полночь склеп засыпает обратно, незаконченный рейд сгорает, налётчик у ворот уходит сам.
        if (get().crypt && get().crypt!.day !== day) set({ crypt: newCrypt(day) });
        const raidNow = get().raid;
        if (raidNow && raidNow.status === 'active' && raidNow.day !== day) set({ raid: { ...raidNow, status: 'lost' } });
        const raidsNow = get().raids;
        if (raidsNow.defense && raidsNow.defense.day !== day) set({ raids: { ...raidsNow, defense: null } });
        // Ответный рейд чужих: раз в день, в свой час. Застал тебя дома — налётчик ждёт у ворот.
        // Новичка на обучении не трогаем: стража справляется сама.
        if (get().tutorial.done && raidsNow.enemyDay !== day && now >= enemyRaidDueAt(day, now) && get().war && !(raidNow && raidNow.status === 'active' && raidNow.day === day)) {
          const e = rollEnemyRaid(next.side, next.level, get().npcGuilds, rng);
          const atHome = next.location === e.town && !get().travel && get().fight?.status !== 'active';
          const war = get().war;
          if (war) set({ war: addWarPoints(war, e.side, e.points) });
          if (atHome) {
            const opponent = raidOpponent(e.side, next.level, get().npcGuilds, rng);
            set({ raids: { ...get().raids, enemyDay: day, defense: { day, town: e.town, side: e.side, opponent } } });
            worldSays('tavern', defenseNews(e));
          } else {
            set({ raids: { ...get().raids, enemyDay: day } });
            worldSays('tavern', enemyRaidNews(e));
          }
        }
      },

      cureInjury: (pay = 'kredits') => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const injury = activeInjury(c);
        if (!injury) return { ok: false, reason: 'Травм нет' };
        if (pay === 'bogwort') {
          // В Топях знахарь берёт меньше болотника (особенность города).
          const need = townOf(c.location)?.perk.injuryBogwort ?? INJURY_BOGWORT;
          if (c.resources.bogwort < need) return { ok: false, reason: `Нужно ${need} болотника` };
          set({ character: { ...c, injury: null, resources: { ...c.resources, bogwort: c.resources.bogwort - need } } });
          return { ok: true, kredits: 0 };
        }
        const cost = townPrice(cureCostToday(c, injury), townHealerMult(c.location));
        if (c.kredits < cost) return { ok: false, reason: `Нужно ${cost} кр.` };
        set({ character: { ...c, injury: null, kredits: c.kredits - cost } });
        return { ok: true, kredits: cost };
      },

      heal: (fraction = 1, pay = 'kredits') => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const maxHp = deriveCharacter(c).maxHp;
        if (c.hp >= maxHp) return { ok: false, reason: 'Ты и так здоров' };
        const hp = Math.min(maxHp, c.hp + healAmount(c, fraction));
        if (pay === 'herbs') {
          const herbs = fraction >= 1 ? POTION_HERBS.large : fraction >= 0.6 ? POTION_HERBS.medium : POTION_HERBS.small;
          if (c.resources.herbs < herbs) return { ok: false, reason: `Нужно ${herbs} трав` };
          set({ character: { ...c, hp, resources: { ...c.resources, herbs: c.resources.herbs - herbs }, hpUpdatedAt: Date.now() } });
        } else if (pay === 'bones') {
          // Костная мука из склепа: лекарь варит на ней зелья.
          const bones = fraction >= 1 ? POTION_BONES.large : fraction >= 0.6 ? POTION_BONES.medium : POTION_BONES.small;
          if (c.resources.bones < bones) return { ok: false, reason: `Нужно ${bones} костей` };
          set({ character: { ...c, hp, resources: { ...c.resources, bones: c.resources.bones - bones }, hpUpdatedAt: Date.now() } });
        } else {
          const cost = townPrice(healPriceToday(c, fraction), townHealerMult(c.location));
          if (c.kredits < cost) return { ok: false, reason: `Нужно ${cost} кр.` };
          set({ character: { ...c, hp, kredits: c.kredits - cost, hpUpdatedAt: Date.now() } });
        }
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
            ledger: { ...c.ledger, itemsBought: c.ledger.itemsBought + 1, kreditsSpent: c.ledger.kreditsSpent + item.price },
          },
        });
        get().track('buyItem');
        get().advanceTutorial();
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
        // Проверяем требования без вещи, которую заменяем; щит при двуручнике (и наоборот) снимается сам.
        const prepared = prepareEquip(c, item);
        const check = canEquip(prepared.character, item);
        if (!check.ok) return check;
        const next: Character = { ...prepared.character, equipment: { ...prepared.character.equipment, [prepared.slot]: itemUid } };
        next.hp = Math.min(next.hp, deriveCharacter(next).maxHp);
        set({ character: next });
        const conflict = handsConflict(c, item);
        return { ok: true, note: conflict === 'shield' ? 'щит снят' : conflict === 'weapon' ? 'оружие снято' : undefined };
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
        set({ arena: newArena(c) });
      },

      startFight: (opponentId) => {
        const state = get();
        const c = state.character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Бой уже идёт' };
        if (state.mining) return { ok: false, reason: 'Ты в шахте. Сначала забери заработок.' };
        if (!isTown(c.location) || state.travel) return { ok: false, reason: 'Арены есть в городах. Сначала дойди.' };
        const opponent = state.arena.find((o) => o.id === opponentId);
        if (!opponent) return { ok: false, reason: 'Соперник ушёл' };
        const fresh = applyRegen(c);
        if (fresh.hp < 1) return { ok: false, reason: 'Нет сил драться. Подожди или сходи к лекарю.' };

        const fight: FightState = {
          context: 'arena',
          venue: isTown(c.location) ? c.location : 'city',
          opponent,
          playerHp: fresh.hp,
          enemyHp: opponent.derived.maxHp,
          turn: 1,
          status: 'active',
          log: [
            makeLogLine(0, `${fresh.name} против ${opponent.name}. Бой начался!`, 'system'),
            ...(opponent.rivalId && RIVALS_BY_ID[opponent.rivalId]
              ? [makeLogLine(0, `${opponent.name}: «${rivalTaunt(RIVALS_BY_ID[opponent.rivalId], rng)}»`, 'enemy')]
              : []),
            ...(activeInjury(fresh) ? [makeLogLine(0, `${fresh.name} дерётся с травмой: ${injuryText(activeInjury(fresh)!).toLowerCase()}.`, 'system')] : []),
          ],
          playerMoves: [],
          lastEnemyMove: null,
          reward: null,
          startedAt: Date.now(),
        };
        set({ character: fresh, fight, lastFightContext: 'arena' });
        get().advanceTutorial();
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
        // Новичку объясняем крит и уворот, когда они случились впервые.
        if (result.strikes.some((x) => x.outcome === 'crit' || x.outcome === 'crit-through-block')) explainOnce('crit', log, f.turn);
        if (result.strikes.some((x) => x.outcome === 'dodged')) explainOnce('dodge', log, f.turn);

        const next: FightState = {
          ...f,
          playerHp: result.playerHp,
          enemyHp: result.enemyHp,
          turn: f.turn + 1,
          status: result.status,
          log,
          lastStrikes: result.strikes,
          playerMoves: [...f.playerMoves, move],
          lastEnemyMove: enemyMove,
        };

        // Счётчики урона и критов копятся по раундам.
        const crit = ps.outcome === 'crit' || ps.outcome === 'crit-through-block' ? 1 : 0;
        const counted: Character = {
          ...c,
          ledger: {
            ...c.ledger,
            damageDealt: c.ledger.damageDealt + ps.damage,
            damageTaken: c.ledger.damageTaken + es.damage,
            crits: c.ledger.crits + crit,
          },
        };

        if (result.status === 'active') {
          set({ character: counted, fight: next });
          get().advanceTutorial();
          return;
        }
        const settled = settle(counted, { ...next, log: [...log, makeLogLine(f.turn, describeFinish(result.status, c.name, f.opponent.name), 'system')] }, result.status);
        set({ character: settled.character, fight: { ...next, log: settled.log, reward: settled.reward } });
        get().advanceTutorial();
      },

      surrender: () => {
        const state = get();
        const c = state.character;
        const f = state.fight;
        if (!c || !f || f.status !== 'active') return;
        const log = [...f.log, makeLogLine(f.turn, `${c.name} сдаётся. ${f.opponent.name} забирает победу.`, 'system')];
        const next: FightState = { ...f, status: 'lost', log, lastStrikes: null };
        const settled = settle(c, next, 'lost');
        set({ character: settled.character, fight: { ...next, log: settled.log, reward: settled.reward } });
      },

      endFight: () => {
        const c = get().character;
        set({ fight: null, arena: c ? newArena(c) : [] });
      },

      startTournament: () => {
        const state = get();
        const c = state.character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Сначала закончи бой' };
        const check = canEnterTournament(c, !!state.mining);
        if (!check.ok) return check;
        if (c.location !== 'city' || state.travel) return { ok: false, reason: 'Замок рядом с городом. Сначала вернись.' };
        const tournament = createTournament(c.level, rng);
        set({ tournament, character: { ...c, lastTournamentDay: tournament.day } });
        return get().startTournamentFight();
      },

      startTournamentFight: () => {
        const state = get();
        const c = state.character;
        const t = state.tournament;
        if (!c || !t) return { ok: false, reason: 'Турнира нет' };
        if (t.status !== 'active') return { ok: false, reason: 'Турнир окончен' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Бой уже идёт' };
        const opponent = t.opponents[t.stage];
        if (!opponent) return { ok: false, reason: 'Соперников больше нет' };
        const fresh = applyRegen(c);
        if (fresh.hp < 1) return { ok: false, reason: 'Нет сил. На турнире не лечат.' };
        const fight: FightState = {
          context: 'tournament',
          opponent,
          playerHp: fresh.hp,
          enemyHp: opponent.derived.maxHp,
          turn: 1,
          status: 'active',
          log: [makeLogLine(0, `Турнир, бой ${t.stage + 1} из ${TOURNAMENT_ROUNDS}: ${fresh.name} против ${opponent.name}.`, 'system')],
          playerMoves: [],
          lastEnemyMove: null,
          reward: null,
          startedAt: Date.now(),
        };
        set({ character: fresh, fight, lastFightContext: 'tournament' });
        return { ok: true };
      },

      sellRelics: () => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (c.location !== 'city') return { ok: false, reason: 'Князь принимает в замке у города' };
        const qty = c.resources.relics;
        if (qty <= 0) return { ok: false, reason: 'Реликвий нет' };
        const total = qty * relicPriceAtCastle(dayKey());
        set({
          character: {
            ...c,
            kredits: c.kredits + total,
            rating: c.rating + qty * RELIC_RATING,
            resources: { ...c.resources, relics: 0 },
            ledger: { ...c.ledger, kreditsEarned: c.ledger.kreditsEarned + total },
          },
        });
        get().track('sellResources', qty);
        return { ok: true, kredits: total };
      },

      dismissRoadNews: () => set({ roadNews: null }),

      startTravel: (to) => {
        const state = get();
        const c = state.character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const check = canTravel(c, to, {
          mining: !!state.mining,
          gathering: !!state.gathering,
          traveling: !!state.travel,
          fighting: state.fight?.status === 'active',
        });
        if (!check.ok || !check.route) return { ok: false, reason: check.reason };
        set({ travel: { from: c.location, to, startedAt: Date.now(), minutes: check.route.minutes } });
        return { ok: true };
      },

      startGathering: (activity, minutes) => {
        const state = get();
        const c = state.character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (!isWild(c.location) || state.travel) return { ok: false, reason: 'Собирать можно только в диких землях' };
        if (state.gathering) return { ok: false, reason: 'Ты уже занят' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Сначала закончи бой' };
        if (!ACTIVITIES_BY_ID[activity]) return { ok: false, reason: 'Такого занятия нет' };
        if (!WILDS[c.location].activities.includes(activity)) return { ok: false, reason: 'Здесь этим не занимаются' };
        if (!isGatherMinutes(minutes)) return { ok: false, reason: 'Такой смены нет' };
        set({ gathering: { activity, startedAt: Date.now(), minutes } });
        return { ok: true };
      },

      collectGathering: () => {
        const state = get();
        const c = state.character;
        const g = state.gathering;
        if (!c || !g) return { ok: false, reason: 'Ты ничего не собирал' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Сначала закончи бой' };
        const def = ACTIVITIES_BY_ID[g.activity];
        const amount = gatherYield(g, gatherRatePerHour(g.activity, deriveCharacter(c)), Date.now());
        const wild: WildId = isWild(c.location) ? c.location : 'forest';
        // Засада: улов ставится на кон, начинается бой.
        if (amount > 0 && (rollAmbush(wild, rng) || rng() < eventMults().ambushBonus)) {
          const opponent: OpponentType = wildOpponent(wild, c.level, rng);
          const fresh = applyRegen(c);
          const fight: FightState = {
            context: 'forest',
            opponent,
            playerHp: Math.max(1, fresh.hp),
            enemyHp: opponent.derived.maxHp,
            turn: 1,
            status: 'active',
            log: [makeLogLine(0, `Засада! ${opponent.name} выскакивает на тропу. На кону ${amount} шт.: ${def.haul}.`, 'system')],
            playerMoves: [],
            lastEnemyMove: null,
            reward: null,
            startedAt: Date.now(),
          };
          set({ gathering: null, pendingHaul: { resource: def.resource, amount }, fight, character: fresh, lastFightContext: 'forest' });
          return { ok: true, resource: def.resource, amount, ambush: true };
        }
        set({
          gathering: null,
          character: { ...c, resources: { ...c.resources, [def.resource]: c.resources[def.resource] + amount } },
        });
        get().track('gather', amount);
        return { ok: true, resource: def.resource, amount };
      },

      sellResource: (resource, amount) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (!isTown(c.location)) return { ok: false, reason: 'Скупка в городах' };
        const have = c.resources[resource] ?? 0;
        const qty = Math.min(have, amount ?? have);
        if (qty <= 0) return { ok: false, reason: 'Нечего продавать' };
        const price = marketPriceToday(resource, dayKey(), c.location);
        const total = qty * price;
        set({
          character: {
            ...c,
            kredits: c.kredits + total,
            resources: { ...c.resources, [resource]: have - qty },
            ledger: { ...c.ledger, kreditsEarned: c.ledger.kreditsEarned + total },
          },
        });
        get().track('sellResources', qty);
        return { ok: true, kredits: total };
      },

      claimAchievement: (id) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const a = ACHIEVEMENTS_BY_ID[id];
        if (!a) return { ok: false, reason: 'Такого достижения нет' };
        if (c.achievements.includes(id)) return { ok: false, reason: 'Уже забрал' };
        if (!a.check(c)) return { ok: false, reason: 'Ещё не выполнено' };
        const seals = sealsForAchievement(a);
        set({
          character: {
            ...c,
            kredits: c.kredits + a.reward,
            seals: c.seals + seals,
            achievements: [...c.achievements, id],
            ledger: { ...c.ledger, kreditsEarned: c.ledger.kreditsEarned + a.reward },
          },
        });
        return { ok: true, kredits: a.reward, seals };
      },

      startMining: (hours, job = 'mine') => {
        const state = get();
        if (!state.character) return { ok: false, reason: 'Нет персонажа' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Сначала закончи бой' };
        if (state.mining) return { ok: false, reason: state.mining.job === 'caravan' ? 'Ты уже с караваном' : 'Ты уже в шахте' };
        if (state.travel) return { ok: false, reason: 'Ты в пути' };
        // Работа есть в каждом городе, но своя: шахта или караван — по данным города.
        const town = townOf(state.character.location);
        if (!town) return { ok: false, reason: 'Работу дают в городах. Сначала дойди.' };
        if (town.job !== job) return { ok: false, reason: job === 'mine' ? `${town.locative[0].toUpperCase()}${town.locative.slice(1)} шахты нет, тут нанимают в ${town.jobName.toLowerCase()}.` : `${town.locative[0].toUpperCase()}${town.locative.slice(1)} караванов нет, тут ${town.jobName.toLowerCase()}.` };
        if (!isShiftHours(hours)) return { ok: false, reason: 'Такой смены нет' };
        set({ mining: { startedAt: Date.now(), hours, job } });
        get().advanceTutorial();
        return { ok: true };
      },

      collectMining: () => {
        const { mining, character, fight } = get();
        if (!mining || !character) return { ok: false, reason: 'Ты не на работе' };
        if (fight?.status === 'active') return { ok: false, reason: 'Сначала закончи бой' };
        const job: JobId = mining.job ?? 'mine';
        // Ставка с надбавкой города (степные кони Коша).
        const earned = mineEarnings(mining, Math.round(jobRatePerHour(job, deriveCharacter(character)) * townJobMult(character.location)), Date.now());
        // Караван: на обратной дороге бывает засада, плата на кону.
        if (job === 'caravan' && earned > 0 && rng() < CARAVAN_AMBUSH) {
          const opponent: OpponentType = wildOpponent('pass', character.level, rng);
          const fresh = applyRegen(character);
          const fightState: FightState = {
            context: 'forest',
            opponent,
            playerHp: Math.max(1, fresh.hp),
            enemyHp: opponent.derived.maxHp,
            turn: 1,
            status: 'active',
            log: [makeLogLine(0, `Засада на тракте! ${opponent.name} хочет караван. На кону ${earned} кр. платы.`, 'system')],
            playerMoves: [],
            lastEnemyMove: null,
            reward: null,
            startedAt: Date.now(),
          };
          set({ mining: null, pendingHaul: { resource: 'kredits', amount: earned }, fight: fightState, character: fresh, lastFightContext: 'forest' });
          return { ok: true, kredits: earned };
        }
        set({
          mining: null,
          character: {
            ...character,
            kredits: character.kredits + earned,
            ledger: {
              ...character.ledger,
              mineEarned: character.ledger.mineEarned + (job === 'mine' ? earned : 0),
              kreditsEarned: character.ledger.kreditsEarned + earned,
            },
          },
        });
        if (job === 'mine') get().track('mineHours', Math.floor(mineElapsedMs(mining, Date.now()) / 3_600_000));
        return { ok: true, kredits: earned };
      },

      repairItem: (itemUid) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const inv = c.backpack.find((i) => i.uid === itemUid);
        if (!inv) return { ok: false, reason: 'Предмет не найден' };
        const item = getItem(inv.itemId);
        const cost = townPrice(repairCost(item, inv.durability), townSmithyMult(c.location));
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

      repairAll: (pay = 'kredits') => {
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
        total = townPrice(total, townSmithyMult(c.location));
        if (pay === 'wood') {
          const wood = woodForRepair(total);
          if (c.resources.wood < wood) return { ok: false, reason: `Нужно ${wood} дров` };
          set({ character: { ...c, resources: { ...c.resources, wood: c.resources.wood - wood }, backpack } });
          get().track('repair');
          return { ok: true, kredits: 0 };
        }
        if (pay === 'bones') {
          const bones = bonesForRepair(total);
          if (c.resources.bones < bones) return { ok: false, reason: `Нужно ${bones} костей` };
          set({ character: { ...c, resources: { ...c.resources, bones: c.resources.bones - bones }, backpack } });
          get().track('repair');
          return { ok: true, kredits: 0 };
        }
        if (c.kredits < total) return { ok: false, reason: `На всё нужно ${total} кр.` };
        set({ character: { ...c, kredits: c.kredits - total, backpack } });
        get().track('repair');
        return { ok: true, kredits: total };
      },

      // --- Чат ---------------------------------------------------------------------------------

      sendChat: (channel, text) => {
        const state = get();
        const c = state.character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const v = validateMessage(text);
        if (!v.ok) return v;
        if (channel === 'guild' && !state.guild) return { ok: false, reason: 'Ты не в гильдии' };
        if (isMuted(state.chat, 'player')) return { ok: false, reason: 'Тебя заткнули. Смотрящий решит, когда хватит.' };
        const now = Date.now();
        const clean = cleanText(text);
        const role = state.account.role;
        let chat = appendMessage(state.chat, { id: uid(), channel, at: now, author: me(c), text: clean, kind: role === 'player' ? 'player' : 'staff' });
        // В гильдейском канале отвечают только свои — именные соперники, которых ты позвал.
        const voices = channel === 'guild' ? NPC_VOICES.filter((vc) => state.guild?.members.some((m) => m.rivalId === vc.id)) : NPC_VOICES;
        chat = { ...chat, pending: [...chat.pending, ...npcReplies(clean, channel, rng, now, voices)] };
        set({ chat, chatSeenAt: now });
        return { ok: true };
      },

      markChatSeen: () => set({ chatSeenAt: Date.now() }),

      deleteChatMessage: (id) => {
        const p = need('chat.moderate');
        if (!p.ok) return p;
        const chat = get().chat;
        if (!chat.messages.some((m) => m.id === id)) return { ok: false, reason: 'Сообщения нет' };
        set({ chat: { ...chat, messages: chat.messages.map((m) => (m.id === id ? { ...m, deleted: true } : m)) } });
        return { ok: true };
      },

      muteAuthor: (authorId) => {
        const p = need('chat.moderate');
        if (!p.ok) return p;
        const chat = get().chat;
        if (chat.muted.includes(authorId)) return { ok: false, reason: 'Уже молчит' };
        // Заткнутый завсегдатай и правда замолкает: его отложенные ответы снимаем.
        set({ chat: { ...chat, muted: [...chat.muted, authorId], pending: chat.pending.filter((x) => x.author.id !== authorId) } });
        return { ok: true };
      },

      unmuteAuthor: (authorId) => {
        const p = need('chat.moderate');
        if (!p.ok) return p;
        const chat = get().chat;
        if (!chat.muted.includes(authorId)) return { ok: false, reason: 'Он и не молчал' };
        set({ chat: { ...chat, muted: chat.muted.filter((x) => x !== authorId) } });
        return { ok: true };
      },

      gmBroadcast: (channel, text) => {
        const p = need('chat.broadcast');
        if (!p.ok) return p;
        const v = validateMessage(text);
        if (!v.ok) return v;
        worldSays(channel, cleanText(text));
        return { ok: true };
      },

      // --- Гильдии -----------------------------------------------------------------------------

      foundGuild: (name, tag, emblem, motto = '') => {
        const { character: c, guild, npcGuilds } = get();
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (guild) return { ok: false, reason: 'Ты уже в гильдии' };
        const chk = canFoundGuild(c);
        if (!chk.ok) return chk;
        const n = validateGuildName(name, npcGuilds.map((g) => g.name));
        if (!n.ok) return n;
        const t = validateGuildTag(tag, npcGuilds.map((g) => g.tag));
        if (!t.ok) return t;
        const g = newGuild({ id: uid(), name, tag, emblem, motto, founder: { id: 'player', name: c.name, level: c.level, side: c.side } });
        set({
          guild: g,
          character: { ...c, kredits: c.kredits - GUILD_FOUND_COST, ledger: { ...c.ledger, kreditsSpent: c.ledger.kreditsSpent + GUILD_FOUND_COST } },
        });
        worldSays('tavern', `В городе новая гильдия: «${g.name}» [${g.tag}]. Основал ${c.name}.`);
        worldSays('guild', `Гильдия «${g.name}» основана. Это ваш стол: чужие не слышат.`);
        return { ok: true };
      },

      joinGuild: (guildId) => {
        const { character: c, guild, npcGuilds } = get();
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (guild) return { ok: false, reason: 'Ты уже в гильдии' };
        const target = npcGuilds.find((g) => g.id === guildId);
        if (!target) return { ok: false, reason: 'Такой гильдии нет' };
        const chk = joinCheck(c, target);
        if (!chk.ok) return chk;
        const r = addMember(target, { id: 'player', name: c.name, level: c.level, player: true });
        if (!r.ok) return { ok: false, reason: r.reason };
        set({ guild: r.guild, npcGuilds: npcGuilds.filter((g) => g.id !== guildId) });
        worldSays('guild', `${c.name} принят в «${target.name}». Глава — ${target.members.find((m) => m.rank === 'leader')?.name ?? 'неизвестно кто'}.`);
        return { ok: true };
      },

      leaveGuild: () => {
        const { character: c, guild, npcGuilds } = get();
        if (!c || !guild) return { ok: false, reason: 'Ты не в гильдии' };
        if (isLeader(guild)) return { ok: false, reason: 'Глава не уходит. Распусти гильдию.' };
        const r = removeMember(guild, 'player', 'leave');
        if (!r.ok) return { ok: false, reason: r.reason };
        // Гильдия местных возвращается в таблицу без тебя.
        set({ guild: null, npcGuilds: r.guild.npc ? [...npcGuilds, r.guild] : npcGuilds });
        return { ok: true };
      },

      disbandGuild: () => {
        const { character: c, guild } = get();
        if (!c || !guild) return { ok: false, reason: 'Ты не в гильдии' };
        if (!isLeader(guild)) return { ok: false, reason: 'Распускает только глава' };
        set({ guild: null, skirmish: null });
        worldSays('tavern', `Гильдия «${guild.name}» [${guild.tag}] распущена. ${c.name} пьёт один.`);
        return { ok: true };
      },

      setGuildMotto: (motto) => {
        const guild = get().guild;
        if (!guild) return { ok: false, reason: 'Ты не в гильдии' };
        if (!canManage(guild)) return { ok: false, reason: 'Девиз пишут глава и десятники' };
        set({ guild: { ...guild, motto: cleanText(motto).slice(0, 60) } });
        return { ok: true };
      },

      inviteRival: (rivalId) => {
        const { character: c, guild } = get();
        if (!c || !guild) return { ok: false, reason: 'Ты не в гильдии' };
        if (!canManage(guild)) return { ok: false, reason: 'Зовут глава и десятники' };
        const def = RIVALS_BY_ID[rivalId];
        if (!def) return { ok: false, reason: 'Такого нет' };
        const chk = canRecruitRival(c, rivalId, guild);
        if (!chk.ok) return chk;
        const level = Math.max(0, c.level + def.levelOffset);
        const cost = recruitCost(level);
        if (c.kredits < cost) return { ok: false, reason: `Накрыть стол — ${cost} кр.` };
        const r = addMember(guild, { id: `npc:${rivalId}`, name: def.name, level, rivalId });
        if (!r.ok) return { ok: false, reason: r.reason };
        set({ guild: r.guild, character: { ...c, kredits: c.kredits - cost, ledger: { ...c.ledger, kreditsSpent: c.ledger.kreditsSpent + cost } } });
        worldSays('guild', `${def.name} теперь с нами. Стол накрыл ${c.name}: ${cost} кр.`);
        return { ok: true, kredits: cost };
      },

      kickMember: (memberId) => {
        const guild = get().guild;
        if (!guild) return { ok: false, reason: 'Ты не в гильдии' };
        if (!canManage(guild)) return { ok: false, reason: 'Выгоняют глава и десятники' };
        if (memberId === 'player') return { ok: false, reason: 'Себя не выгонишь' };
        const target = guild.members.find((m) => m.id === memberId);
        if (target?.rank === 'officer' && !isLeader(guild)) return { ok: false, reason: 'Десятника выгоняет глава' };
        const r = removeMember(guild, memberId, 'kick');
        if (!r.ok) return { ok: false, reason: r.reason };
        set({ guild: r.guild });
        return { ok: true };
      },

      setMemberRank: (memberId, rank) => {
        const guild = get().guild;
        if (!guild) return { ok: false, reason: 'Ты не в гильдии' };
        if (!isLeader(guild)) return { ok: false, reason: 'Ранги раздаёт глава' };
        const r = setRank(guild, memberId, rank);
        if (!r.ok) return { ok: false, reason: r.reason };
        set({ guild: r.guild });
        return { ok: true };
      },

      donateGuild: (amount) => {
        const { character: c, guild } = get();
        if (!c || !guild) return { ok: false, reason: 'Ты не в гильдии' };
        const sum = Math.floor(amount);
        if (sum <= 0) return { ok: false, reason: 'Сколько-сколько?' };
        if (c.kredits < sum) return { ok: false, reason: 'Столько нет' };
        set({
          guild: addGuildEvent({ ...guild, treasury: guild.treasury + sum }, `${c.name} внёс ${sum} кр.`),
          character: { ...c, kredits: c.kredits - sum, ledger: { ...c.ledger, kreditsSpent: c.ledger.kreditsSpent + sum } },
        });
        return { ok: true };
      },

      upgradeGuild: () => {
        const guild = get().guild;
        if (!guild) return { ok: false, reason: 'Ты не в гильдии' };
        if (!isLeader(guild)) return { ok: false, reason: 'Уровень поднимает глава' };
        const chk = canUpgradeGuild(guild);
        if (!chk.ok) return chk;
        const cost = guildLevelCost(guild.level);
        const g = addGuildEvent({ ...guild, treasury: guild.treasury - cost, level: guild.level + 1 }, `Гильдия выросла до ${guild.level + 1} уровня за ${cost} кр.`);
        set({ guild: g });
        worldSays('tavern', `«${g.name}» [${g.tag}] теперь ${g.level} уровня. Стол в пивной стал шире.`);
        return { ok: true };
      },

      startSkirmish: (guildId) => {
        const state = get();
        const c = state.character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (!state.guild) return { ok: false, reason: 'Стычки — дело гильдий. Вступи или основай.' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Бой уже идёт' };
        if (state.mining) return { ok: false, reason: 'Сначала забери заработок' };
        if (!isTown(c.location) || state.travel) return { ok: false, reason: 'Стычки устраивают в городах' };
        const enemy = state.npcGuilds.find((g) => g.id === guildId);
        if (!enemy) return { ok: false, reason: 'Такой гильдии нет' };
        const day = dayKey();
        const today = state.skirmishes && state.skirmishes.day === day ? state.skirmishes.count : 0;
        if (today >= SKIRMISHES_PER_DAY) return { ok: false, reason: `На сегодня хватит: ${SKIRMISHES_PER_DAY} стычки в день` };
        const fresh = applyRegen(c);
        if (fresh.hp < 1) return { ok: false, reason: 'Нет сил драться. Подожди или сходи к лекарю.' };
        const opponent = skirmishOpponent(enemy, c.level, rng);
        const fight: FightState = {
          context: 'guild',
          venue: isTown(c.location) ? c.location : 'city',
          opponent,
          playerHp: fresh.hp,
          enemyHp: opponent.derived.maxHp,
          turn: 1,
          status: 'active',
          log: [
            makeLogLine(0, `Стычка: «${state.guild.name}» против «${enemy.name}». ${fresh.name} выходит на ${opponent.name}.`, 'system'),
            makeLogLine(0, `${opponent.name}: «${enemy.motto}»`, 'enemy'),
          ],
          playerMoves: [],
          lastEnemyMove: null,
          reward: null,
          startedAt: Date.now(),
        };
        set({ character: fresh, fight, lastFightContext: 'guild', skirmish: { guildId }, skirmishes: { day, count: today + 1 } });
        return { ok: true };
      },

      // --- Служебный вход ----------------------------------------------------------------------

      unlockGm: (word) => {
        const r = checkGmWord(word);
        if (!r.ok) return r;
        const acc = get().account;
        set({ account: { ...acc, gmUnlocked: true, role: acc.role === 'player' ? 'gm' : acc.role } });
        return { ok: true };
      },

      lockGm: () => set({ account: newAccount() }),

      setRole: (role) => {
        const acc = get().account;
        const r = canSwitchRole(acc, role);
        if (!r.ok) return r;
        set({ account: { ...acc, role } });
        return { ok: true };
      },

      gmGive: (what, amount) => {
        const p = need('player.grant');
        if (!p.ok) return p;
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const n = Math.round(amount);
        if (!Number.isFinite(n) || n === 0) return { ok: false, reason: 'Сколько?' };
        if (what === 'kredits') set({ character: { ...c, kredits: Math.max(0, c.kredits + n) } });
        else if (what === 'exp') set({ character: withExp(c, Math.max(0, n)) });
        else {
          const resources = { ...c.resources };
          for (const k of Object.keys(resources) as (keyof typeof resources)[]) resources[k] = Math.max(0, resources[k] + n);
          set({ character: { ...c, resources } });
        }
        return { ok: true };
      },

      gmSetLevel: (level) => {
        const p = need('player.grant');
        if (!p.ok) return p;
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const lvl = Math.max(0, Math.min(30, Math.round(level)));
        if (lvl <= c.level) return { ok: false, reason: 'Уровень не понижаем: сломает умения и очки' };
        const next = withExp(c, expForLevel(lvl) - c.exp);
        set({ character: { ...next, hp: deriveCharacter(next).maxHp, hpUpdatedAt: Date.now() }, arena: newArena(next) });
        return { ok: true };
      },

      gmHeal: () => {
        const p = need('player.grant');
        if (!p.ok) return p;
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const healthy = { ...c, injury: null };
        set({ character: { ...healthy, hp: deriveCharacter(healthy).maxHp, hpUpdatedAt: Date.now() } });
        return { ok: true };
      },

      gmGiveItem: (itemId) => {
        const p = need('player.grant');
        if (!p.ok) return p;
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const item = getItem(itemId);
        if (!item) return { ok: false, reason: 'Такой вещи нет' };
        set({ character: { ...c, backpack: [...c.backpack, newInventoryItem(uid(), itemId)] } });
        return { ok: true };
      },

      gmTeleport: (to) => {
        const p = need('world.control');
        if (!p.ok) return p;
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (get().fight?.status === 'active') return { ok: false, reason: 'Сначала закончи бой' };
        const next = { ...c, location: to };
        set({ character: next, travel: null, gathering: null, mining: null, pendingHaul: null, roadNews: null, arena: isTown(to) ? newArena(next) : get().arena });
        return { ok: true };
      },

      gmFinishTimers: () => {
        const p = need('world.control');
        if (!p.ok) return p;
        const { mining, gathering, travel } = get();
        if (!mining && !gathering && !travel) return { ok: false, reason: 'Таймеров нет' };
        const now = Date.now();
        set({
          mining: mining ? { ...mining, startedAt: now - mining.hours * 3_600_000 - 1000 } : null,
          gathering: gathering ? { ...gathering, startedAt: now - gathering.minutes * 60_000 - 1000 } : null,
          travel: travel ? { ...travel, startedAt: now - travel.minutes * 60_000 - 1000 } : null,
        });
        get().tick();
        return { ok: true };
      },

      gmNewDay: () => {
        const p = need('world.control');
        if (!p.ok) return p;
        const c = get().character;
        set({
          quests: null,
          tournament: null,
          skirmishes: null,
          character: c ? { ...c, lastTournamentDay: null } : c,
          guild: get().guild ? { ...get().guild!, lastDay: null } : null,
          npcGuilds: get().npcGuilds.map((g) => ({ ...g, lastDay: null })),
          // Война: день закрывается, вчерашний лидер станет победителем на тике.
          war: get().war ? { ...get().war!, day: '' } : null,
          // Склеп засыпает, рейды и налёты можно заново.
          crypt: null,
          raid: null,
          raids: { ...get().raids, lastDay: null, enemyDay: null, defense: null },
          // Награда за вход: отметка на день назад, чтобы забрать снова.
          daily: dailyRewind(get().daily),
        });
        get().tick();
        return { ok: true };
      },

      gmEditGuild: (guildId, patch) => {
        const p = need('guild.manageAny');
        if (!p.ok) return p;
        const clean: typeof patch = {};
        if (patch.name !== undefined) {
          const v = validateGuildName(patch.name);
          if (!v.ok) return v;
          clean.name = patch.name.trim();
        }
        if (patch.tag !== undefined) {
          const v = validateGuildTag(patch.tag);
          if (!v.ok) return v;
          clean.tag = patch.tag.trim().toUpperCase();
        }
        if (patch.motto !== undefined) clean.motto = cleanText(patch.motto).slice(0, 60);
        if (patch.level !== undefined) clean.level = Math.max(1, Math.min(5, Math.round(patch.level)));
        if (patch.treasury !== undefined) clean.treasury = Math.max(0, Math.round(patch.treasury));
        if (patch.rating !== undefined) clean.rating = Math.max(0, Math.round(patch.rating));
        const g = get().guild;
        if (g && g.id === guildId) {
          set({ guild: addGuildEvent({ ...g, ...clean }, 'Мастер игры поправил гильдию.') });
          return { ok: true };
        }
        if (!get().npcGuilds.some((x) => x.id === guildId)) return { ok: false, reason: 'Такой гильдии нет' };
        set({ npcGuilds: get().npcGuilds.map((x) => (x.id === guildId ? { ...x, ...clean } : x)) });
        return { ok: true };
      },

      gmDisbandGuild: (guildId) => {
        const p = need('guild.manageAny');
        if (!p.ok) return p;
        const g = get().guild;
        if (g && g.id === guildId) {
          set({ guild: null, skirmish: null });
          worldSays('tavern', `Мастер игры распустил «${g.name}» [${g.tag}].`);
          return { ok: true };
        }
        const npc = get().npcGuilds.find((x) => x.id === guildId);
        if (!npc) return { ok: false, reason: 'Такой гильдии нет' };
        set({ npcGuilds: get().npcGuilds.filter((x) => x.id !== guildId) });
        worldSays('tavern', `Мастер игры распустил «${npc.name}» [${npc.tag}].`);
        return { ok: true };
      },

      setSound: (on) => set({ settings: { ...get().settings, sound: on } }),

      // --- Ежедневки, сундуки, события ---------------------------------------------------------

      claimDaily: () => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const r = claimDailyState(get().daily, c.level, rng);
        if (!r) return { ok: false, reason: 'Сегодня уже забрал. Приходи завтра' };
        // Ярмарка кладёт сверху деревянный сундук.
        const bonus = eventMults().dailyChest;
        const loot: ChestLoot[] = bonus ? [...r.loot, { kind: 'chest', chest: bonus }] : r.loot;
        set({ character: applyLoot(c, loot, uid), daily: r.state });
        // Седьмой день подряд — ещё и печати князя для лавки косметики.
        if (r.day === DAILY_DAYS) get().grantSeals(SEALS_FOR_WEEK_STREAK);
        return { ok: true, day: r.day, loot };
      },

      ensureWeekly: () => {
        const { character, daily } = get();
        if (!character) return null;
        if (daily.weekly && daily.weekly.week === weekKey()) return daily.weekly;
        const weekly = generateWeekly(rng);
        set({ daily: { ...daily, weekly } });
        return weekly;
      },

      trackWeekly: (event, amount = 1) => {
        const board = get().ensureWeekly();
        if (!board) return;
        const next = applyWeeklyEvent(board, event, amount);
        if (next !== board) set({ daily: { ...get().daily, weekly: next } });
      },

      claimWeekly: (goalId) => {
        const c = get().character;
        const board = get().ensureWeekly();
        if (!c || !board) return { ok: false, reason: 'Нет персонажа' };
        const g = board.goals.find((x) => x.id === goalId);
        if (!g) return { ok: false, reason: 'Такой цели нет' };
        if (g.claimed) return { ok: false, reason: 'Уже забрал' };
        if (!weeklyDone(g)) return { ok: false, reason: 'Ещё не выполнено' };
        const chest = weeklyChest(g);
        set({
          character: giveChest(c, chest),
          daily: { ...get().daily, weekly: { ...board, goals: board.goals.map((x) => (x.id === goalId ? { ...x, claimed: true } : x)) } },
        });
        return { ok: true, chest };
      },

      openChest: (kind) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const chests = normalizeChests(c.chests);
        if (chests[kind] <= 0) return { ok: false, reason: 'Такого сундука у тебя нет' };
        const loot = openChestLoot(kind, c.level, rng);
        const opened: Character = { ...c, chests: { ...chests, [kind]: chests[kind] - 1 } };
        set({ character: applyLoot(opened, loot, uid) });
        return { ok: true, loot };
      },

      advanceTutorial: (extras, force = false) => {
        const { character: c, tutorial, fight, mining } = get();
        if (!c || tutorial.done) return;
        const snap: TutorialSnapshot = {
          fightActive: !!fight,
          movesMade: fight?.playerMoves.length ?? 0,
          fightsTotal: c.ledger.fightsTotal,
          itemsBought: c.ledger.itemsBought,
          mineStarted: !!mining || c.ledger.mineEarned > 0,
          ...extras,
        };
        const r = advanceSteps(tutorial, snap, force);
        if (r.tutorial === tutorial) return;
        if (r.reward) {
          set({
            tutorial: r.tutorial,
            character: {
              ...c,
              kredits: c.kredits + r.reward.kredits,
              resources: { ...c.resources, herbs: c.resources.herbs + r.reward.herbs },
              ledger: { ...c.ledger, kreditsEarned: c.ledger.kreditsEarned + r.reward.kredits },
            },
          });
          worldSays('tavern', `${c.name} больше не новичок. Старый Солдат выдал ${r.reward.kredits} кр. и пучок трав на зелье.`);
          return;
        }
        set({ tutorial: r.tutorial });
      },

      skipTutorial: () => set({ tutorial: skipSteps(get().tutorial) }),

      // --- Склеп и рейды ---

      travelHome: () => {
        const state = get();
        const c = state.character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const check = canTravelHome(c, {
          mining: !!state.mining,
          gathering: !!state.gathering,
          traveling: !!state.travel,
          fighting: state.fight?.status === 'active',
        });
        if (!check.ok || !check.route) return { ok: false, reason: check.reason };
        set({ travel: { from: c.location, to: check.route.to, startedAt: Date.now(), minutes: check.route.minutes } });
        return { ok: true };
      },

      startCryptFight: () => {
        const state = get();
        const c = state.character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (c.location !== 'crypt' || state.travel) return { ok: false, reason: 'Склеп — место на карте мира. Сначала дойди.' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Бой уже идёт' };
        if (state.mining) return { ok: false, reason: 'Сначала забери заработок' };
        const day = dayKey();
        if (state.raid && state.raid.status === 'active' && state.raid.day === day) return { ok: false, reason: 'Ты в рейде. Сначала закончи наверху.' };
        const crypt = normalizeCrypt(state.crypt, day);
        const floor = nextFloor(crypt);
        if (!floor) return { ok: false, reason: 'На сегодня склеп пройден до дна. Внизу — выход наверх, завтра всё засыплет обратно.' };
        const fresh = applyRegen(c);
        if (fresh.hp < 1) return { ok: false, reason: 'Нет сил. Под землёй не лечат.' };
        const opponent: OpponentType = cryptOpponent(floor, c.level, rng);
        const fight: FightState = {
          context: 'crypt',
          cryptFloor: floor,
          opponent,
          playerHp: fresh.hp,
          enemyHp: opponent.derived.maxHp,
          turn: 1,
          status: 'active',
          log: [
            makeLogLine(0, `Ярус ${floor}, «${CRYPT_BY_FLOOR[floor].name}». ${CRYPT_BY_FLOOR[floor].flavor}`, 'system'),
            makeLogLine(0, `${opponent.name} поднимается навстречу.`, 'enemy'),
          ],
          playerMoves: [],
          lastEnemyMove: null,
          reward: null,
          startedAt: Date.now(),
        };
        set({ character: fresh, fight, crypt, lastFightContext: 'forest' });
        return { ok: true };
      },

      startRaid: () => {
        const state = get();
        const c = state.character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (c.location !== 'crypt' || state.travel) return { ok: false, reason: 'Выход наверх — с нижнего яруса склепа' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Бой уже идёт' };
        if (state.mining) return { ok: false, reason: 'Сначала забери заработок' };
        const day = dayKey();
        const crypt = normalizeCrypt(state.crypt, day);
        const check = canStartRaid({ cleared: cryptCleared(crypt), log: state.raids, day, raid: state.raid, hp: applyRegen(c).hp });
        if (!check.ok) return check;
        const raid = newRaid(day, c.side);
        set({ raid, raids: { ...state.raids, lastDay: day }, crypt });
        worldSays('arena', `${SIDES_BY_ID[c.side].name} лезет в ${TOWNS_BY_ID[raid.target].name} через склеп: ${c.name} уже наверху.`);
        return get().startRaidFight();
      },

      startRaidFight: () => {
        const state = get();
        const c = state.character;
        const raid = state.raid;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (!raid || raid.status !== 'active' || raid.day !== dayKey()) return { ok: false, reason: 'Рейда нет' };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Бой уже идёт' };
        const fresh = applyRegen(c);
        if (fresh.hp < 1) return { ok: false, reason: 'Нет сил. В чужом городе не лечат: подожди или бросай рейд.' };
        const guilds = [...state.npcGuilds, ...(state.guild ? [state.guild] : [])];
        const opponent = raidOpponent(raid.side, c.level, guilds, rng);
        const fight: FightState = {
          context: 'raid',
          venue: raid.target,
          opponent,
          playerHp: fresh.hp,
          enemyHp: opponent.derived.maxHp,
          turn: 1,
          status: 'active',
          log: [
            makeLogLine(0, `Рейд, бой ${raid.stage + 1} из ${RAID_FIGHTS}: ${fresh.name} против ${opponent.name} ${TOWNS_BY_ID[raid.target].locative}.`, 'system'),
            ...(activeInjury(fresh) ? [makeLogLine(0, `${fresh.name} дерётся с травмой: ${injuryText(activeInjury(fresh)!).toLowerCase()}.`, 'system')] : []),
          ],
          playerMoves: [],
          lastEnemyMove: null,
          reward: null,
          startedAt: Date.now(),
        };
        set({ character: fresh, fight, lastFightContext: 'forest' });
        return { ok: true };
      },

      abandonRaid: () => {
        const { character: c, raid, fight } = get();
        if (!c || !raid || raid.status !== 'active') return { ok: false, reason: 'Рейда нет' };
        if (fight?.status === 'active') return { ok: false, reason: 'Сначала закончи бой' };
        set({ raid: { ...raid, status: 'lost' } });
        worldSays('tavern', raidNews(c.name, c.side, raid.target, raid.kills, 'lost'));
        return { ok: true };
      },

      startDefense: () => {
        const state = get();
        const c = state.character;
        const d = state.raids.defense;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (!d) return { ok: false, reason: 'Никто не ломится' };
        if (c.location !== d.town || state.travel) return { ok: false, reason: `Налётчик у ворот ${TOWNS_BY_ID[d.town].name}, а ты не там` };
        if (state.fight?.status === 'active') return { ok: false, reason: 'Бой уже идёт' };
        if (state.mining) return { ok: false, reason: 'Сначала забери заработок' };
        const fresh = applyRegen(c);
        if (fresh.hp < 1) return { ok: false, reason: 'Нет сил драться. Пусть стража разбирается.' };
        const fight: FightState = {
          context: 'raid',
          venue: d.town,
          opponent: d.opponent,
          playerHp: fresh.hp,
          enemyHp: d.opponent.derived.maxHp,
          turn: 1,
          status: 'active',
          log: [makeLogLine(0, `Налёт на ${TOWNS_BY_ID[d.town].name}: ${d.opponent.name} у ворот. ${fresh.name} выходит навстречу.`, 'system')],
          playerMoves: [],
          lastEnemyMove: null,
          reward: null,
          startedAt: Date.now(),
        };
        set({ character: fresh, fight, lastFightContext: 'forest' });
        return { ok: true };
      },

      dismissDefense: () => set({ raids: { ...get().raids, defense: null } }),

      gmResetSave: () => {
        const p = need('save.reset');
        if (!p.ok) return p;
        get().resetGame();
        return { ok: true };
      },

      upgradeItem: (itemUid, pay = 'kredits') => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const inv = c.backpack.find((i) => i.uid === itemUid);
        if (!inv) return { ok: false, reason: 'Предмет не найден' };
        const item = getItem(inv.itemId);
        if (!canUpgrade(item)) return { ok: false, reason: 'Это не точится' };
        if (inv.upgrade >= UPGRADE_MAX) return { ok: false, reason: 'Дальше точить некуда' };
        if (inv.durability <= 0) return { ok: false, reason: 'Сначала почини' };
        const next = inv.upgrade + 1;
        const cost = townPrice(upgradeCost(item, next), townSmithyMult(c.location));
        const backpack = c.backpack.map((i) => (i.uid === itemUid ? { ...i, upgrade: next } : i));
        if (pay === 'ore') {
          const ore = oreForUpgrade(cost);
          if (c.resources.ore < ore) return { ok: false, reason: `Нужно ${ore} руды` };
          set({ character: { ...c, resources: { ...c.resources, ore: c.resources.ore - ore }, backpack } });
          get().track('sharpen');
          return { ok: true };
        }
        if (c.kredits < cost) return { ok: false, reason: `Нужно ${cost} кр.` };
        set({ character: { ...c, kredits: c.kredits - cost, backpack } });
        get().track('sharpen');
        return { ok: true };
      },

      // --- Косметика ---
      buyCosmetic: (id) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const r = canBuyCosmetic(c, id);
        if (!r.ok) return r;
        set({ character: buyCosmeticPure(c, id) });
        return { ok: true };
      },

      equipCosmetic: (id) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (!c.cosmetics.owned.includes(id)) return { ok: false, reason: 'Сначала купи' };
        set({ character: equipCosmeticPure(c, id) });
        return { ok: true };
      },

      unequipCosmetic: (kind) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (!c.cosmetics.equipped[kind]) return { ok: false, reason: 'Нечего снимать' };
        set({ character: unequipCosmeticPure(c, kind) });
        return { ok: true };
      },

      buySeals: (seals) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        if (!SEAL_PACKS.some((p) => p.seals === seals)) return { ok: false, reason: 'Такой пачки нет' };
        const price = sealPackPrice(seals);
        if (c.kredits < price) return { ok: false, reason: `Нужно ${price} кр.` };
        set({ character: { ...c, kredits: c.kredits - price, seals: c.seals + seals, ledger: { ...c.ledger, kreditsSpent: c.ledger.kreditsSpent + price } } });
        return { ok: true };
      },

      grantSeals: (amount) => {
        const c = get().character;
        if (!c) return { ok: false, reason: 'Нет персонажа' };
        const n = Math.round(amount);
        if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: 'Сколько?' };
        set({ character: { ...c, seals: c.seals + n } });
        return { ok: true };
      },

      gmGiveSeals: (amount) => {
        const p = need('player.grant');
        if (!p.ok) return p;
        return get().grantSeals(amount);
      },
      };
    },
    {
      name: 'combat-save-v1',
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        character: s.character,
        fight: s.fight,
        arena: s.arena,
        mining: s.mining,
        quests: s.quests,
        tournament: s.tournament,
        lastFightContext: s.lastFightContext,
        travel: s.travel,
        gathering: s.gathering,
        pendingHaul: s.pendingHaul,
        roadNews: s.roadNews,
        account: s.account,
        chat: s.chat,
        chatSeenAt: s.chatSeenAt,
        guild: s.guild,
        npcGuilds: s.npcGuilds,
        skirmish: s.skirmish,
        skirmishes: s.skirmishes,
        settings: s.settings,
        tutorial: s.tutorial,
        war: s.war,
        crypt: s.crypt,
        raid: s.raid,
        raids: s.raids,
        daily: s.daily,
      }),
      // Старые сейвы дописываем недостающими полями (прочность, заточка, будущие фичи).
      migrate: (persisted) => {
        const state = persisted as Partial<GameState>;
        return { ...state, character: state.character ? normalizeCharacter(state.character) : null };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.character) state.character = normalizeCharacter(state.character);
        state.chat = normalizeChat(state.chat);
        state.npcGuilds = normalizeGuilds(state.npcGuilds);
        // Гильдия игрока из старого сейва получает его сторону.
        if (state.guild) state.guild = normalizeGuild(state.guild, state.character?.side);
        state.war = state.character ? normalizeWar(state.war, dayKey()) : (state.war ?? null);
        state.account = state.account ?? newAccount();
        state.settings = { sound: state.settings?.sound ?? true };
        state.tutorial = normalizeTutorial(state.tutorial, state.character?.ledger.fightsTotal ?? 0);
        // Склеп и рейды: старым сейвам — пустые поля, вчерашний спуск сгорает.
        state.crypt = state.crypt ? normalizeCrypt(state.crypt, dayKey()) : null;
        state.raid = state.raid && typeof state.raid.day === 'string' && state.raid.day === dayKey() ? state.raid : null;
        state.raids = normalizeRaidLog(state.raids);
        state.daily = normalizeDaily(state.daily);
        state.setHydrated();
      },
    },
  ),
);

/** Удобные селекторы. */
export const useCharacter = () => useGame((s) => s.character);
export const useFight = () => useGame((s) => s.fight);
