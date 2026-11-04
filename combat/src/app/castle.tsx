import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

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
  deriveCharacter,
  RELIC_RATING,
  relicPriceAtCastle,
  nextRank,
  rankFor,
  TOURNAMENT_ROUNDS,
  tournamentLevels,
  tournamentPrize,
} from '@/game';
import { useFlash } from '@/hooks/useFlash';
import { useNow } from '@/hooks/useNow';
import { Flash } from '@/components/Flash';
import { GiIcon } from '@/components/GiIcon';
import { useGame } from '@/store/useGame';
import { colors, spacing } from '@/ui/theme';

/** Замок: рейтинг, звание, титулы и ежедневный турнир князя. */
export default function CastleScreen() {
  const character = useGame((s) => s.character);
  const tournament = useGame((s) => s.tournament);
  const mining = useGame((s) => s.mining);
  const startTournament = useGame((s) => s.startTournament);
  const startTournamentFight = useGame((s) => s.startTournamentFight);
  const sellRelics = useGame((s) => s.sellRelics);
  const now = useNow();
  const [flash, show] = useFlash();

  if (!character) return null;

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
});
