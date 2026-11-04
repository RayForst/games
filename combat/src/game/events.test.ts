import { describe, expect, it } from 'vitest';

import { healPrice, newCharacter } from './character';
import {
  activeEvent,
  arenaEventMult,
  CALENDAR,
  CALENDAR_EPOCH,
  CALENDAR_LENGTH,
  dayIndex,
  daysBetween,
  eventMults,
  EVENTS,
  EVENTS_BY_ID,
  healPriceToday,
  marketPriceToday,
  NEUTRAL_MULTS,
  nextEvent,
  roadLoss,
  roadLossText,
  shiftDay,
  upcomingEvents,
} from './events';
import { marketPrice } from './wilds';

/** Первый день события `id` в первом цикле календаря. */
function firstDayOf(id: string): string {
  let offset = 0;
  for (const slot of CALENDAR) {
    if (slot.id === id) return shiftDay(CALENDAR_EPOCH, offset);
    offset += slot.days;
  }
  throw new Error(`нет события ${id}`);
}

describe('дни', () => {
  it('сдвиг и разница дней согласованы, переход через месяц и год', () => {
    expect(shiftDay('2026-11-30', 1)).toBe('2026-12-01');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDay('2026-11-01', -1)).toBe('2026-10-31');
    expect(daysBetween('2026-11-02', '2026-11-09')).toBe(7);
    expect(daysBetween('2026-11-09', '2026-11-02')).toBe(-7);
    expect(dayIndex('2026-11-03') - dayIndex('2026-11-02')).toBe(1);
  });
});

describe('календарь событий', () => {
  it('эпоха — первый день ярмарки, после трёх дней тишина', () => {
    const ev = activeEvent(CALENDAR_EPOCH)!;
    expect(ev.def.id).toBe('fair');
    expect(ev.dayOf).toBe(1);
    expect(ev.daysLeft).toBe(3);
    const last = activeEvent(shiftDay(CALENDAR_EPOCH, 2))!;
    expect(last.dayOf).toBe(3);
    expect(last.daysLeft).toBe(1);
    expect(activeEvent(shiftDay(CALENDAR_EPOCH, 3))).toBeNull();
  });

  it('все события календаря есть в описаниях, цикл замыкается, до эпохи тоже считается', () => {
    for (const slot of CALENDAR) if (slot.id) expect(EVENTS_BY_ID[slot.id]).toBeTruthy();
    for (const e of EVENTS) expect(CALENDAR.some((s) => s.id === e.id && s.days === e.days)).toBe(true);
    for (let i = 0; i < CALENDAR_LENGTH; i++) {
      const a = activeEvent(shiftDay(CALENDAR_EPOCH, i));
      const b = activeEvent(shiftDay(CALENDAR_EPOCH, i + CALENDAR_LENGTH));
      const c = activeEvent(shiftDay(CALENDAR_EPOCH, i - CALENDAR_LENGTH));
      expect(b?.def.id ?? null).toBe(a?.def.id ?? null);
      expect(c?.def.id ?? null).toBe(a?.def.id ?? null);
      expect(c?.dayOf).toBe(a?.dayOf);
    }
    const busy = Array.from({ length: CALENDAR_LENGTH }, (_, i) => activeEvent(shiftDay(CALENDAR_EPOCH, i))).filter(Boolean).length;
    expect(busy).toBe(EVENTS.reduce((s, e) => s + e.days, 0));
  });

  it('следующее событие: в тихий день — через сколько, в шумный — ноль', () => {
    const quiet = shiftDay(CALENDAR_EPOCH, 3);
    const n = nextEvent(quiet);
    expect(n.inDays).toBe(2);
    expect(n.def.id).toBe('hunt');
    expect(nextEvent(CALENDAR_EPOCH).inDays).toBe(0);
    const up = upcomingEvents(quiet, 14);
    expect(up[0].def.id).toBe('hunt');
    expect(up[0].startsIn).toBe(2);
    expect(up[1].startsIn).toBeGreaterThan(up[0].startsIn);
    const fromFairLastDay = upcomingEvents(shiftDay(CALENDAR_EPOCH, 2), 14);
    expect(fromFairLastDay[0].def.id).toBe('fair');
    expect(fromFairLastDay[0].startsIn).toBe(-2);
  });
});

describe('множители событий', () => {
  it('тихий день нейтрален, ярмарка поднимает скупку на треть', () => {
    expect(eventMults(shiftDay(CALENDAR_EPOCH, 3))).toEqual(NEUTRAL_MULTS);
    const fair = firstDayOf('fair');
    expect(eventMults(fair).market).toBe(1.3);
    expect(marketPriceToday('wood', fair)).toBe(Math.max(1, Math.round(marketPrice('wood', fair) * 1.3)));
    expect(marketPriceToday('wood', fair, 'brod')).toBeGreaterThanOrEqual(marketPriceToday('wood', fair));
  });

  it('охота: шкуры вдвое, остальное как было; засады чаще', () => {
    const hunt = firstDayOf('hunt');
    expect(marketPriceToday('pelts', hunt)).toBe(marketPrice('pelts', hunt) * 2);
    expect(marketPriceToday('herbs', hunt)).toBe(marketPrice('herbs', hunt));
    expect(eventMults(hunt).ambushBonus).toBeGreaterThan(0);
  });

  it('чума: лекарь вдвое дороже и травмы чаще', () => {
    const plague = firstDayOf('plague');
    const c = newCharacter('Тест');
    expect(healPriceToday(c, 1, plague)).toBe(Math.ceil(healPrice(c, 1) * 2));
    expect(healPriceToday(c, 1, shiftDay(CALENDAR_EPOCH, 3))).toBe(healPrice(c, 1));
    expect(eventMults(plague).injuryExtraRoll).toBe(true);
  });

  it('набор в стражу платит только за победу над Вольницей', () => {
    const guard = firstDayOf('guard');
    expect(arenaEventMult('crown', 'free', 'won', guard)).toBe(1.5);
    expect(arenaEventMult('crown', 'crown', 'won', guard)).toBe(1);
    expect(arenaEventMult('free', 'free', 'won', guard)).toBe(1);
    expect(arenaEventMult('crown', 'free', 'lost', guard)).toBe(1);
    expect(arenaEventMult('crown', undefined, 'won', guard)).toBe(1);
    expect(arenaEventMult('crown', 'free', 'won', shiftDay(CALENDAR_EPOCH, 3))).toBe(1);
  });

  it('ночь воров: десятина с кошеля, трофеи и сундуки вдвое', () => {
    const thieves = firstDayOf('thieves');
    expect(roadLoss(100, () => 0, thieves)).toBe(10);
    expect(roadLoss(5, () => 0, thieves)).toBe(1);
    expect(roadLoss(100, () => 0.99, thieves)).toBe(0);
    expect(roadLoss(0, () => 0, thieves)).toBe(0);
    expect(roadLoss(100, () => 0, shiftDay(CALENDAR_EPOCH, 3))).toBe(0);
    expect(roadLossText(7, () => 0)).toContain('7');
    expect(eventMults(thieves).lootMult).toBe(2);
    expect(eventMults(thieves).chestMult).toBe(2);
  });
});
