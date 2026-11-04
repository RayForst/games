import { describe, expect, it } from 'vitest';

import { newCharacter } from './character';
import { CAPITALS, RACES } from './races';
import { capitalOf, TOWNS, TOWNS_BY_ID, townHealerMult, townJobMult, townOf, townPrice, townSmithyMult } from './towns';
import { canTravel, canTravelHome, isTown, LOCATIONS_BY_ID, locationOpen, pathMinutes, routeBetween, TOWN_IDS } from './world';
import { MARKET_MULT, marketPrice } from './wilds';

const free = { mining: false, gathering: false, traveling: false, fighting: false };

describe('столицы рас', () => {
  it('каждая столица из CAPITALS — город на карте с данными в TOWNS', () => {
    for (const c of CAPITALS) {
      expect(isTown(c.id)).toBe(true);
      expect(LOCATIONS_BY_ID[c.id].name).toBe(c.name);
      expect(TOWNS_BY_ID[c.id].name).toBe(c.name);
      expect(c.onMap).toBe(true);
    }
    expect(TOWNS.map((t) => t.id).sort()).toEqual([...TOWN_IDS].sort());
    // У каждой расы своя столица, и она на стороне расы.
    for (const r of RACES) expect(TOWNS_BY_ID[r.capital].side).toBe(r.side);
    expect(capitalOf('crown').id).toBe('city');
    expect(capitalOf('free').id).toBe('brod');
  });

  it('столицы Короны у Города, Вольницы — у Брода, склеп между ними', () => {
    expect(routeBetween('city', 'rudnya')).not.toBeNull();
    expect(routeBetween('city', 'zastava')).not.toBeNull();
    expect(routeBetween('brod', 'kamenka')).not.toBeNull();
    expect(routeBetween('brod', 'kosh')).not.toBeNull();
    expect(routeBetween('swamp', 'topi')).not.toBeNull();
    expect(routeBetween('city', 'crypt')?.minutes).toBe(2);
    expect(routeBetween('brod', 'crypt')?.minutes).toBe(3);
    expect(LOCATIONS_BY_ID.crypt.minLevel).toBe(1);
    // Дорога между любыми двумя местами есть.
    for (const a of TOWN_IDS) for (const b of TOWN_IDS) expect(pathMinutes(a, b)).not.toBeNull();
    expect(pathMinutes('city', 'city')).toBe(0);
    expect(pathMinutes('city', 'brod')).toBe(5); // через склеп короче, чем через перевал (8)
  });

  it('родной город открыт с нуля, чужие — по уровню', () => {
    const karl = newCharacter('Барт', undefined, undefined, 0, { side: 'crown', race: 'karl' });
    expect(karl.home).toBe('rudnya');
    expect(locationOpen('rudnya', 0)).toBe(false);
    expect(locationOpen('rudnya', 0, 'rudnya')).toBe(true);
    expect(canTravel(karl, 'rudnya', free).ok).toBe(true);
    expect(canTravel(karl, 'zastava', free).ok).toBe(false);
    expect(canTravel({ ...karl, level: 2 }, 'zastava', free).ok).toBe(true);
    expect(canTravel(karl, 'crypt', free).ok).toBe(false); // с 1 уровня
    expect(canTravel({ ...karl, level: 1 }, 'crypt', free).ok).toBe(true);
    // Человек из Города: Рудня закрыта до 2-го.
    const human = newCharacter('Вася');
    expect(human.home).toBe('city');
    expect(canTravel(human, 'rudnya', free).ok).toBe(false);
  });

  it('домой — одним переходом по кратчайшей дороге', () => {
    const bog = newCharacter('Тень', undefined, undefined, 0, { side: 'free', race: 'bog' });
    expect(bog.home).toBe('topi');
    const r = canTravelHome(bog, free);
    expect(r.ok).toBe(true);
    expect(r.route).toEqual({ from: 'city', to: 'topi', minutes: 7 });
    expect(canTravelHome({ ...bog, location: 'topi' }, free).ok).toBe(false);
    expect(canTravelHome(bog, { ...free, mining: true }).ok).toBe(false);
    expect(canTravelHome(newCharacter('Вася'), free).ok).toBe(false); // дом — Город, уже тут
  });

  it('особенности столиц — по данным', () => {
    expect(townSmithyMult('rudnya')).toBe(0.8);
    expect(townSmithyMult('city')).toBe(1);
    expect(townPrice(100, townSmithyMult('rudnya'))).toBe(80);
    expect(townPrice(0, 0.8)).toBe(0);
    expect(townPrice(1, 0.5)).toBe(1);
    expect(townHealerMult('zastava')).toBe(0.75);
    expect(townJobMult('kosh')).toBe(1.2);
    expect(townJobMult('brod')).toBe(1);
    expect(TOWNS_BY_ID.topi.perk.injuryBogwort).toBe(2);
    expect(MARKET_MULT.kamenka).toBeGreaterThan(MARKET_MULT.city);
    expect(marketPrice('pelts', '2026-11-04', 'kamenka')).toBeGreaterThanOrEqual(marketPrice('pelts', '2026-11-04', 'city'));
    expect(marketPrice('bones', '2026-11-04')).toBeGreaterThan(0);
    expect(townOf('forest')).toBeNull();
    expect(townOf('brod')?.job).toBe('caravan');
    expect(TOWNS_BY_ID.brod.arenaMult).toBe(1.2);
    expect(TOWNS_BY_ID.brod.arenaLevelBonus).toBe(1);
    // Ровно одна особенность на город, и она описана.
    for (const t of TOWNS) {
      expect(t.perk.name.length).toBeGreaterThan(2);
      expect(t.perk.description.length).toBeGreaterThan(10);
      expect(t.locative.length).toBeGreaterThan(3);
    }
  });
});
