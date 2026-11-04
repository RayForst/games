import { describe, expect, it } from 'vitest';

import { newCharacter, normalizeCharacter, healPrice } from './character';
import { ITEMS_BY_ID } from './items';
import { offerPerks } from './perks';
import { rivalLine, RIVALS_BY_ID } from './rivals';
import {
  alignmentName,
  alignmentPriceMult,
  alignmentTone,
  applyStoryEvent,
  availableChains,
  chainFinished,
  chooseStoryOption,
  claimStoryReward,
  clampAlignment,
  newStory,
  normalizeStory,
  progressOf,
  rewardText,
  shopPrice,
  startChains,
  stepProgress,
  storyAttention,
  STORY_BY_ID,
  STORY_CHAINS,
  storyStep,
  type StoryContext,
  type StoryState,
} from './story';
import type { Character } from './types';
import { ROAD_EVENTS } from './wilds';

const hero = (patch: Partial<Character> = {}): Character => ({ ...newCharacter('Тест'), ...patch });
const ctx = (character: Character, inGuild = false): StoryContext => ({ character, inGuild });

/** Прогнать событие и вернуть состояние с эффектами. */
function fire(state: StoryState, c: Character, event: Parameters<typeof applyStoryEvent>[2]) {
  return applyStoryEvent(state, ctx(c), event);
}

describe('сюжетные цепочки', () => {
  it('у каждой линии 4–6 шагов, все вещи и голоса существуют, развилки парные', () => {
    expect(STORY_CHAINS.length).toBeGreaterThanOrEqual(7);
    for (const ch of STORY_CHAINS) {
      expect(ch.steps.length).toBeGreaterThanOrEqual(4);
      expect(ch.steps.length).toBeLessThanOrEqual(6);
      expect(new Set(ch.steps.map((s) => s.id)).size).toBe(ch.steps.length);
      const forks = ch.steps.filter((s) => s.condition.kind === 'choice');
      expect(forks.length).toBeGreaterThanOrEqual(1);
      for (const s of forks) expect(s.choices).toHaveLength(2);
      for (const s of ch.steps) if (s.condition.kind !== 'choice') expect(s.choices).toBeUndefined();
      const items = [ch.reward.item, ...ch.steps.flatMap((s) => [s.reward?.item, ...(s.choices ?? []).map((o) => o.reward?.item)])].filter(Boolean) as string[];
      for (const id of items) expect(ITEMS_BY_ID[id], id).toBeDefined();
    }
  });

  it('новичку открывается Толян и линия своей стороны, остальные — по уровню', () => {
    const crown = hero();
    const open = availableChains(newStory(), crown).map((c) => c.id);
    expect(open).toEqual(['tolyan-debt', 'crown-guard']);
    const free = hero({ side: 'free', race: 'orc' });
    expect(availableChains(newStory(), free).map((c) => c.id)).toEqual(['tolyan-debt', 'free-ferry']);
    const grown = availableChains(newStory(), hero({ level: 3 })).map((c) => c.id);
    expect(grown).toContain('nyura-fourth');
    expect(grown).toContain('soldier-charter');
    expect(grown).toContain('butcher-apron');
    expect(grown).toContain('pass-road');
    expect(grown).not.toContain('free-ferry');
    // Уже открытые второй раз не стартуют.
    const started = startChains(newStory(), crown);
    expect(startChains(started, crown)).toBe(started);
  });

  it('«Толян и долг»: шаги закрываются по одному событию за раз, развилка ждёт выбора', () => {
    let c = hero();
    let s = startChains(newStory(), c);
    // Победа над Бартом — не Толян.
    let r = fire(s, c, { event: 'rivalWin', detail: 'bart' });
    expect(progressOf(r.state, 'tolyan-debt')!.step).toBe(0);
    r = fire(r.state, c, { event: 'rivalWin', detail: 'tolyan' });
    s = r.state;
    const p1 = progressOf(s, 'tolyan-debt')!;
    expect(p1.step).toBe(1);
    expect(r.effects.map((e) => e.stepId)).toEqual(['beat']);
    expect(r.effects[0].say?.who).toBe('tolyan');
    // Второй шаг — тоже Толян; одна победа закрывает только один шаг.
    r = fire(s, c, { event: 'rivalWin', detail: 'tolyan' });
    s = r.state;
    const p2 = progressOf(s, 'tolyan-debt')!;
    expect(p2.step).toBe(2);
    expect(p2.awaiting).toBe(true);
    expect(storyStep(p2)!.condition.kind).toBe('choice');
    expect(r.effects[0].reward).toEqual({ exp: 10 });
    // Пока ждём выбора, события не двигают линию.
    expect(fire(s, c, { event: 'rivalWin', detail: 'tolyan' }).state).toBe(s);
    expect(storyAttention(s)).toBe(1);
    // Тёмный выбор: двадцать себе.
    const ch = chooseStoryOption(s, 'tolyan-debt', 1);
    expect(ch.ok).toBe(true);
    expect(ch.effect?.reward).toEqual({ alignment: -5, kredits: 20 });
    s = ch.state;
    expect(progressOf(s, 'tolyan-debt')!.choices.boot).toBe(1);
    expect(chooseStoryOption(s, 'tolyan-debt', 0).ok).toBe(false);
    // Шаг по уровню: закрывается перепроверкой без события.
    expect(fire(s, c, undefined).state).toBe(s);
    c = { ...c, level: 1 };
    r = fire(s, c, undefined);
    s = r.state;
    expect(progressOf(s, 'tolyan-debt')!.step).toBe(4);
    // Две победы — линия пройдена, награда один раз.
    r = fire(s, c, { event: 'fightWin', detail: 'city' });
    expect(r.effects).toHaveLength(0);
    r = fire(r.state, c, { event: 'fightWin', detail: 'city' });
    s = r.state;
    expect(chainFinished(progressOf(s, 'tolyan-debt')!)).toBe(true);
    expect(r.effects[0].finished).toBe(true);
    const claim = claimStoryReward(s, 'tolyan-debt');
    expect(claim.ok).toBe(true);
    expect(claim.reward).toEqual(STORY_BY_ID['tolyan-debt'].reward);
    expect(claimStoryReward(claim.state, 'tolyan-debt').ok).toBe(false);
    expect(claimStoryReward(s, 'nyura-fourth').ok).toBe(false);
  });

  it('детали событий: арена Брода, сторона соперника, ресурсы со снятием', () => {
    const c = hero({ level: 3, resources: { ...hero().resources, ore: 4 }, location: 'brod' });
    let s = startChains(newStory(), c);
    const pass = () => progressOf(s, 'pass-road')!;
    // Шаг «дойди до Брода» закрывается состоянием сразу при открытии.
    s = fire(s, c, undefined).state;
    expect(pass().step).toBe(1);
    s = fire(s, c, { event: 'caravan' }).state;
    expect(pass().step).toBe(2);
    expect(pass().awaiting).toBe(true);
    s = chooseStoryOption(s, 'pass-road', 0).state;
    // Руда: условие по ресурсу, эффект снимает 4 куска.
    const r = fire(s, c, undefined);
    s = r.state;
    expect(pass().step).toBe(4);
    expect(r.effects[0].take).toEqual({ resource: { id: 'ore', amount: 4 } });
    expect(stepProgress(storyStep(pass())!, pass(), ctx(c))).toEqual([0, 3]);
    s = fire(s, c, { event: 'fightWin', detail: 'city' }).state;
    expect(pass().counts.arena).toBeUndefined();
    s = fire(s, c, { event: 'fightWin', detail: 'brod' }).state;
    expect(stepProgress(storyStep(pass())!, pass(), ctx(c))).toEqual([1, 3]);
    // Поручение стражи: победы над вольными считаются, над своими — нет.
    const guard = () => progressOf(s, 'crown-guard')!;
    s = fire(s, c, { event: 'fightPlay', amount: 3 }).state;
    expect(guard().step).toBe(1);
    s = fire(s, c, { event: 'sideWin', detail: 'crown' }).state;
    s = fire(s, c, { event: 'sideWin', detail: 'free' }).state;
    expect(guard().counts.free).toBe(1);
  });

  it('устав Солдата ведёт в гильдию и даёт флаг', () => {
    const c = hero({ level: 2 });
    let s = startChains(newStory(), c);
    const sol = () => progressOf(s, 'soldier-charter')!;
    s = fire(s, c, { event: 'fightPlay', amount: 5 }).state;
    s = fire(s, c, { event: 'rivalWin', detail: 'soldier' }).state;
    s = fire(s, c, { event: 'repair' }).state;
    expect(sol().awaiting).toBe(true);
    const ch = chooseStoryOption(s, 'soldier-charter', 0);
    expect(ch.effect?.reward?.alignment).toBe(5);
    s = ch.state;
    s = fire(s, c, { event: 'rivalWin', detail: 'soldier' }).state;
    expect(sol().step).toBe(5);
    expect(applyStoryEvent(s, ctx(c, false), undefined).state).toBe(s);
    s = applyStoryEvent(s, ctx(c, true), { event: 'guildJoin' }).state;
    expect(chainFinished(sol())).toBe(true);
    expect(STORY_BY_ID['soldier-charter'].reward.flag).toBe('charter');
  });

  it('две развилки подряд: после выбора линия ждёт на следующей', () => {
    const c = hero({ level: 2, resources: { ...hero().resources, pelts: 5 } });
    let s = startChains(newStory(), c);
    const b = () => progressOf(s, 'butcher-apron')!;
    s = fire(s, c, { event: 'fightWin', amount: 3 }).state;
    s = fire(s, c, undefined).state; // шкуры
    expect(b().step).toBe(2);
    expect(b().awaiting).toBe(true);
    s = chooseStoryOption(s, 'butcher-apron', 0).state;
    s = fire(s, c, { event: 'rivalWin', detail: 'shadow' }).state;
    expect(b().step).toBe(4);
    expect(b().awaiting).toBe(true);
    const dark = chooseStoryOption(s, 'butcher-apron', 0);
    expect(dark.effect?.reward?.title).toBe('Подмастерье Цеха');
    expect(dark.effect?.reward?.flag).toBe('apron');
    expect(progressOf(dark.state, 'butcher-apron')!.awaiting).toBe(false);
  });

  it('состояние переживает старый сейв', () => {
    const s = normalizeStory(undefined);
    expect(s).toEqual({ chains: [], flags: [] });
    const half = normalizeStory({ chains: [{ id: 'tolyan-debt', step: 2 } as never, { id: 'nope', step: 0 } as never] });
    expect(half.chains).toHaveLength(1);
    expect(half.chains[0]).toEqual({ id: 'tolyan-debt', step: 2, counts: {}, choices: {}, awaiting: false, claimed: false });
    expect(rewardText({ kredits: 30, exp: 25, item: 'club', title: 'Т', alignment: -5 }, (id) => ITEMS_BY_ID[id].name)).toBe('+30 кр. · +25 оп. · Дубина · титул «Т» · -5 к тёмной');
  });
});

describe('склонность', () => {
  it('названия и оттенки по шкале, значение не выходит за ±100', () => {
    expect(alignmentName(100)).toBe('Святоша');
    expect(alignmentName(20)).toBe('Честный');
    expect(alignmentName(0)).toBe('Никакой');
    expect(alignmentName(-20)).toBe('Гнилой');
    expect(alignmentName(-60)).toBe('Чёрный');
    expect(alignmentTone(0)).toBeNull();
    expect(alignmentTone(25)).toBe('light');
    expect(alignmentTone(-25)).toBe('dark');
    expect(clampAlignment(140)).toBe(100);
    expect(clampAlignment(-140.4)).toBe(-100);
  });

  it('цены: светлым дешевле у лекаря, тёмным — в лавке, до 5 %', () => {
    expect(alignmentPriceMult(0, 'healer')).toBe(1);
    expect(alignmentPriceMult(100, 'healer')).toBeCloseTo(0.95);
    expect(alignmentPriceMult(-100, 'healer')).toBeCloseTo(1.05);
    expect(alignmentPriceMult(-100, 'shop')).toBeCloseTo(0.95);
    const saint = hero({ level: 5, alignment: 100 });
    const black = hero({ level: 5, alignment: -100 });
    expect(healPrice(saint, 1)).toBeLessThan(healPrice(black, 1));
    expect(shopPrice(black, ITEMS_BY_ID.sword)).toBeLessThan(shopPrice(saint, ITEMS_BY_ID.sword));
    expect(shopPrice(hero(), ITEMS_BY_ID.sword)).toBe(ITEMS_BY_ID.sword.price);
  });

  it('старый сейв без склонности — «Никакой», новый персонаж тоже', () => {
    expect(hero().alignment).toBe(0);
    const raw = { ...hero() } as Partial<Character>;
    delete raw.alignment;
    expect(normalizeCharacter(raw as Character).alignment).toBe(0);
  });

  it('реплики именных: своя для светлого и тёмного, обычная для никакого', () => {
    const t = RIVALS_BY_ID.tolyan;
    expect(rivalLine(t, true, () => 0, 0)).toBe(t.excuses[0]);
    expect(rivalLine(t, true, () => 0, 50)).toBe(t.byAlignment!.light!.excuses![0]);
    expect(rivalLine(t, false, () => 0, -50)).toBe(t.byAlignment!.dark!.gloats![0]);
    // Бросок выше половины — общая реплика даже у святоши.
    expect(t.excuses).toContain(rivalLine(t, true, () => 0.9, 100));
    for (const r of Object.values(RIVALS_BY_ID)) expect(r.byAlignment).toBeDefined();
  });

  it('дорожные события сдвигают склонность в обе стороны, умения — на краях', () => {
    const shifts = ROAD_EVENTS.map((mk) => mk(0, () => 0.5).alignment ?? 0);
    expect(shifts.some((a) => a > 0)).toBe(true);
    expect(shifts.some((a) => a < 0)).toBe(true);
    expect(offerPerks([], () => 0, 30, 60)).toContain('clear-conscience');
    expect(offerPerks([], () => 0, 30, -60)).toContain('black-heart');
    expect(offerPerks([], () => 0, 30, 59)).not.toContain('clear-conscience');
  });
});
