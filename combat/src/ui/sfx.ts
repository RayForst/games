import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { useGame } from '@/store/useGame';

// Звуки. Боевые собраны скриптом scripts/sfx.mjs (assets/sfx/*.wav), интерфейсные — из npm-пакета uisfx,
// набор «cinematic», CC0 (см. CREDITS.md). Игрок выключает звук на экране персонажа (`settings.sound`).

const SOURCES = {
  hit: require('../../assets/sfx/hit.wav'),
  crit: require('../../assets/sfx/crit.wav'),
  block: require('../../assets/sfx/block.wav'),
  dodge: require('../../assets/sfx/dodge.wav'),
  win: require('../../assets/sfx/win.wav'),
  lose: require('../../assets/sfx/lose.wav'),
  coin: require('../../assets/sfx/ui-purchase.mp3'),
  levelup: require('../../assets/sfx/ui-level-up.mp3'),
  achievement: require('../../assets/sfx/ui-achievement.mp3'),
  unlock: require('../../assets/sfx/ui-unlock.mp3'),
  message: require('../../assets/sfx/ui-send.mp3'),
  error: require('../../assets/sfx/ui-error.mp3'),
} as const;

export type SfxName = keyof typeof SOURCES;

const VOLUME: Partial<Record<SfxName, number>> = { hit: 0.8, crit: 1, block: 0.7, dodge: 0.6, win: 0.9, lose: 0.8, message: 0.5, error: 0.6 };

const players: Partial<Record<SfxName, AudioPlayer>> = {};
let modeReady = false;

/** Один раз на запуск: играть и в беззвучном режиме телефона, не глушить чужую музыку. */
function ensureMode() {
  if (modeReady) return;
  modeReady = true;
  setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

/** Проиграть звук, если звук включён. Ошибки глотаем: браузер без жеста или телефон без динамика — не повод падать. */
export function playSfx(name: SfxName) {
  if (!useGame.getState().settings.sound) return;
  try {
    ensureMode();
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(SOURCES[name]);
      p.volume = VOLUME[name] ?? 0.8;
      players[name] = p;
    }
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    /* звук — не критично */
  }
}

/** Звуки раунда боя: сначала удар игрока, через паузу — ответ соперника. */
export function playStrikes(outcomes: [string | undefined, string | undefined]) {
  const toName = (o: string | undefined): SfxName | null =>
    o === 'crit' || o === 'crit-through-block' ? 'crit' : o === 'hit' ? 'hit' : o === 'blocked' ? 'block' : o === 'dodged' ? 'dodge' : null;
  const first = toName(outcomes[0]);
  const second = toName(outcomes[1]);
  if (first) playSfx(first);
  if (second) setTimeout(() => playSfx(second), 260);
}
