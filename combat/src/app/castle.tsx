import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/BackBar';
import { Bar } from '@/components/Bar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Kredits } from '@/components/Kredits';
import { Screen } from '@/components/Screen';
import { Txt } from '@/components/Txt';
import {
  BUILDINGS_BY_ID,
  canEnterTournament,
  dayKey,
  defectCost,
  deriveCharacter,
  originText,
  racesOf,
  RACES_BY_ID,
  SIDES,
  SIDES_BY_ID,
  STAT_LABELS,
  WAR_KREDITS_MULT,
  WAR_PLAYER_POINTS,
  WAR_RATING_BONUS,
  warLeader,
  type RaceId,
  type SideId,
  RELIC_RATING,
  relicPriceAtCastle,
  nextRank,
  rankFor,
  TOURNAMENT_ROUNDS,
  tournamentLevels,
  tournamentPrize,
  RAID_FIGHTS,
  RAID_WAR_POINTS,
  SEALS_FOR_TOURNAMENT,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useNow } from '@/hooks/useNow';
import { Flash } from '@/components/Flash';
import { GiIcon } from '@/components/GiIcon';
import { SideBadge } from '@/components/SideBadge';
import { useGame } from '@/store/useGame';
import { colors, radius, sideColors, spacing } from '@/ui/theme';

/** Замок: рейтинг, звание, титулы и ежедневный турнир князя. */
export default function CastleScreen() {
  const character = useGame((s) => s.character);
  const tournament = useGame((s) => s.tournament);
  const mining = useGame((s) => s.mining);
  const startTournament = useGame((s) => s.startTournament);
  const startTournamentFight = useGame((s) => s.startTournamentFight);
  const sellRelics = useGame((s) => s.sellRelics);
  const war = useGame((s) => s.war);
  const raids = useGame((s) => s.raids);
  const raidToday = useGame((s) => (s.raid && s.raid.day === dayKey() ? s.raid : null));
  const defectTo = useGame((s) => s.defectTo);
  const now = useNow();
  const [flash, show] = useFlash();
  const [defecting, setDefecting] = useState(false);
  const [pickSide, setPickSide] = useState<SideId | null>(null);
  const [pickRace, setPickRace] = useState<RaceId | null>(null);

  if (!character) return null;

  const mySide = SIDES_BY_ID[character.side];
  const leader = war ? warLeader(war) : null;
  const cost = defectCost(character.defections);
  const chosenSide = pickSide ?? character.side;
  const chosenRace = pickRace && RACES_BY_ID[pickRace].side === chosenSide ? pickRace : null;

  const confirmDefect = () => {
    if (!chosenRace) return;
    const race = RACES_BY_ID[chosenRace];
    const text = `${chosenSide === character.side ? 'Сменить род' : `Перебежать за ${SIDES_BY_ID[chosenSide].accusative}`}: ${race.name}, +1 ${STAT_LABELS[race.stat].toLowerCase()}, «${race.trait.name}». ${cost > 0 ? `Князь берёт ${cost} кр.` : 'В первый раз — бесплатно.'}`;
    const doIt = () => {
      const r = defectTo(chosenSide, chosenRace);
      show(r.ok ? `Бумаги переписаны: ${originText(chosenSide, chosenRace)}.` : (r.reason ?? 'Не получилось'));
      if (r.ok) {
        setDefecting(false);
        setPickSide(null);
        setPickRace(null);
      }
    };
    // На вебе Alert.alert молчит — спрашиваем окном браузера.
    if (Platform.OS === 'web') {
      if (typeof globalThis.confirm !== 'function' || globalThis.confirm(text)) doIt();
      return;
    }
    Alert.alert('Перебежчик', text, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Да', style: 'destructive', onPress: doIt },
    ]);
  };

  const derived = deriveCharacter(character, now);
  const todays = tournament && tournament.day === dayKey(now) ? tournament : null;
  const entry = canEnterTournament(character, !!mining, now);
  const prize = tournamentPrize(character.level);
  const next = nextRank(character.rating);

  const go = (r: { ok: boolean; reason?: string }) => {
    if (!r.ok) {
      Alert.alert('Замок', r.reason ?? 'Не получилось');
      return;
    }
    router.push('/fight');
  };

  return (
    <Screen>
      <BackBar right={<Kredits value={character.kredits} />} />
      <View>
        <Txt variant="title">Замок</Txt>
        <Txt variant="muted">{BUILDINGS_BY_ID.castle.description}</Txt>
      </View>

      <Flash text={flash} />

      <Card title="Казначей князя" right={<GiIcon name="relics" size={22} />}>
        <Txt variant="muted">
          Скупает реликвии из руин вдвое дороже лавки: {relicPriceAtCastle(dayKey(now))} кр. за штуку сегодня, и по {RELIC_RATING} очка рейтинга за каждую.
        </Txt>
        <Button
          small
          variant="secondary"
          title={character.resources.relics > 0 ? `Сдать ${character.resources.relics} шт. · ${character.resources.relics * relicPriceAtCastle(dayKey(now))} кр.` : 'Реликвий нет'}
          disabled={character.resources.relics === 0}
          onPress={() => {
            const r = sellRelics();
            show(r.ok ? `Казначей отсчитал ${r.kredits} кр. Князь запомнил имя.` : (r.reason ?? 'Не получилось'));
          }}
        />
      </Card>

      <Card title="Война сторон" right={<SideBadge side={character.side} full />}>
        {war ? (
          <>
            <View style={styles.warRow}>
              {SIDES.map((s) => {
                const points = war[s.id];
                const lead = leader === s.id;
                return (
                  <View key={s.id} style={[styles.warCell, { borderColor: lead ? sideColors[s.id] : colors.border }]}>
                    <Txt variant="small" color={sideColors[s.id]} bold>
                      {s.name}
                      {s.id === character.side ? ' · твоя' : ''}
                    </Txt>
                    <Txt bold style={styles.warScore} color={lead ? sideColors[s.id] : colors.text}>
                      {points}
                    </Txt>
                  </View>
                );
              })}
            </View>
            <Txt variant="small">
              {leader ? `${SIDES_BY_ID[leader].name} ведёт сегодня.` : 'Сегодня ничья.'} Победа над чужой стороной: +{WAR_PLAYER_POINTS} очка своим и +{WAR_RATING_BONUS} рейтинга. Местные дерутся сами, по очку за бой.
            </Txt>
            <Txt variant="small" color={colors.textDim}>
              Рейды через склеп: победа в чужой столице даёт +{RAID_WAR_POINTS} очков. Твоих полных рейдов: {raids.won}, отбитых налётов: {raids.defended}
              {raidToday ? `; сегодня ${raidToday.status === 'active' ? 'рейд идёт' : `уложил ${raidToday.kills} из ${RAID_FIGHTS}`}.` : '.'}
            </Txt>
            {war.winner ? (
              <Txt variant="small" color={war.winner === character.side ? colors.green : colors.textMuted}>
                Вчера победила {SIDES_BY_ID[war.winner].name}: {war.winner === character.side ? `сегодня твои бои платят на ${Math.round((WAR_KREDITS_MULT - 1) * 100)} % больше.` : `её бойцы сегодня получают на ${Math.round((WAR_KREDITS_MULT - 1) * 100)} % больше кредитов за бои.`}
              </Txt>
            ) : (
              <Txt variant="small" color={colors.textDim}>
                Вчера победителя не было. Победитель дня получает на {Math.round((WAR_KREDITS_MULT - 1) * 100)} % больше кредитов за бои назавтра.
              </Txt>
            )}
          </>
        ) : (
          <Txt variant="muted">Счёт откроется с первым боем.</Txt>
        )}
      </Card>

      <Card title="Перебежчик" right={<Txt variant="small" color={colors.textMuted}>{originText(character.side, character.race)}</Txt>}>
        <Txt variant="muted">
          Князь переписывает бумаги: другая сторона, другой род. Расовый +1 переезжает на новую характеристику. Первый раз бесплатно, дальше по {defectCost(1)} кр.
          {mySide.id === 'crown' ? ' Князь ворчит, но подписывает.' : ' Князю плевать, кем ты был на тракте.'}
        </Txt>
        {defecting ? (
          <>
            <View style={styles.sides}>
              {SIDES.map((s) => {
                const active = s.id === chosenSide;
                return (
                  <Pressable key={s.id} onPress={() => setPickSide(s.id)} accessibilityRole="button" style={[styles.sideCard, active && { borderColor: sideColors[s.id], backgroundColor: colors.bgElevated }]}>
                    <Txt bold color={active ? sideColors[s.id] : colors.text}>
                      {s.name}
                    </Txt>
                    <Txt variant="small">{s.motto}</Txt>
                  </Pressable>
                );
              })}
            </View>
            {racesOf(chosenSide).map((r) => {
              const active = r.id === chosenRace;
              const current = r.id === character.race;
              return (
                <Pressable key={r.id} onPress={() => setPickRace(r.id)} disabled={current} accessibilityRole="button" style={[styles.raceRow, active && { borderColor: sideColors[chosenSide], backgroundColor: colors.bgElevated }, current && styles.dim]}>
                  <Txt bold color={active ? sideColors[chosenSide] : colors.text}>
                    {r.name}
                    {current ? ' · ты' : ''}
                  </Txt>
                  <Txt variant="small">
                    +1 {STAT_LABELS[r.stat].toLowerCase()} · {r.trait.description.toLowerCase()}
                  </Txt>
                </Pressable>
              );
            })}
            <Button title={chosenRace ? `Переписать бумаги${cost > 0 ? ` · ${cost} кр.` : ' · бесплатно'}` : 'Выбери род'} disabled={!chosenRace} onPress={confirmDefect} variant="danger" />
            <Button title="Передумал" variant="ghost" small onPress={() => setDefecting(false)} />
          </>
        ) : (
          <Button title={cost > 0 ? `Сменить сторону · ${cost} кр.` : 'Сменить сторону · бесплатно'} variant="secondary" onPress={() => setDefecting(true)} />
        )}
      </Card>

      <Card title="Рейтинг" right={<Txt variant="gold">{rankFor(character.rating)}</Txt>}>
        <Txt>
          {character.rating} очков{next ? ` · до звания «${next.name}» ещё ${next.left}` : ' · выше некуда'}
        </Txt>
        <Txt variant="small">Победа +8 (и +4 за каждый уровень соперника сверх твоего), ничья +1, поражение −4. На турнире вдвое.</Txt>
        {character.titles.length > 0 ? (
          <Txt variant="small" color={colors.gold}>
            Титулы: {character.titles.join(' · ')}
          </Txt>
        ) : null}
      </Card>

      <Card title="Лавка князя" right={<GiIcon name="boutique" size={22} />}>
        <Txt variant="muted">
          Рамки портрета, прозвища, эмблемы и цвет имени за печати князя. Печати — за достижения и турнир ({SEALS_FOR_TOURNAMENT} за победу). На бой не влияет.
        </Txt>
        <Button variant="secondary" title={`Зайти в лавку · ${character.seals} печ.`} onPress={() => router.push('/boutique')} />
      </Card>

      {todays && todays.status === 'active' ? (
        <Card title={`Турнир: бой ${todays.stage + 1} из ${TOURNAMENT_ROUNDS}`} style={styles.hot}>
          <Bar value={todays.stage} max={TOURNAMENT_ROUNDS} color={colors.gold} height={8} showNumbers={false} label="Пройдено" />
          <Txt>
            Следующий: <Txt bold>{todays.opponents[todays.stage].name}</Txt>, {todays.opponents[todays.stage].level} ур.
          </Txt>
          <Txt variant="small">
            Твоё здоровье {character.hp}/{derived.maxHp}. Между боями не лечат, но можно отдохнуть: регенерация идёт.
          </Txt>
          <Button title="К бою" onPress={() => go(startTournamentFight())} variant="danger" />
        </Card>
      ) : todays && todays.status === 'won' ? (
        <Card title="Турнир выигран" style={styles.hot}>
          <Txt color={colors.green}>Сегодня ты чемпион. Князь доволен, толпа запомнила имя.</Txt>
          <Txt variant="small">Завтра новый турнир и новые соперники.</Txt>
        </Card>
      ) : todays && todays.status === 'lost' ? (
        <Card title="Турнир окончен">
          <Txt color={colors.red}>Выбыл на {todays.stage + 1}-м бою из {TOURNAMENT_ROUNDS}.</Txt>
          <Txt variant="small">Завтра можно снова. Подлечись, заточи оружие, вернись.</Txt>
        </Card>
      ) : (
        <Card title="Турнир князя">
          <Txt variant="muted">
            Четыре боя подряд: соперники {tournamentLevels(character.level).join(', ')} уровня. Здоровье между боями не
            восстанавливают. Выстоишь все четыре — приз.
          </Txt>
          <Txt>
            Приз: <Txt variant="gold">{prize.kredits} кр.</Txt> · {prize.exp} опыта · титул «{prize.title}»
          </Txt>
          <Button title="Выйти на турнир" onPress={() => go(startTournament())} disabled={!entry.ok} />
          {!entry.ok ? (
            <Txt variant="small" color={colors.red}>
              {entry.reason}
            </Txt>
          ) : (
            <Txt variant="small">Вход раз в день, нужна хотя бы половина здоровья.</Txt>
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hot: { borderColor: colors.gold },
  gap: { gap: spacing.sm },
  warRow: { flexDirection: 'row', gap: spacing.sm },
  warCell: { flex: 1, alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, backgroundColor: colors.bgElevated },
  warScore: { fontSize: 24, lineHeight: 30 },
  sides: { flexDirection: 'row', gap: spacing.sm },
  sideCard: { flex: 1, gap: 2, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  raceRow: { padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent' },
  dim: { opacity: 0.5 },
});
