import { useGame } from '@/store/useGame';
import { BACKEND_MODE, BACKEND_URL, type GameBackend } from './backend';
import { getDeviceToken } from './device';
import { createLocalBackend } from './localBackend';
import { ServerBackend, createServerBackend } from './serverBackend';

// Кто отвечает за чат, гильдии и роли: стор на телефоне (как всегда) или сервер из `server/`.
// Режим задаёт `EXPO_PUBLIC_BACKEND_URL` (см. `BACKEND_MODE` в backend.ts): пусто — локальный,
// иначе адрес сервера, например ws://192.168.1.10:8787.

export { BACKEND_MODE, BACKEND_URL } from './backend';

let instance: GameBackend | null = null;
let server: ServerBackend | null = null;

export function getBackend(): GameBackend {
  if (instance) return instance;
  if (BACKEND_MODE === 'server') {
    server = createServerBackend({
      url: BACKEND_URL,
      token: getDeviceToken,
      identity: () => {
        const c = useGame.getState().character;
        return c ? { name: c.name, level: c.level, rating: c.rating } : { name: '' };
      },
      adminSecret: process.env.EXPO_PUBLIC_ADMIN_SECRET || undefined,
      log: (line) => console.log(`[server] ${line}`),
    });
    // Персонаж создан или вырос — сервер должен знать имя и уровень.
    useGame.subscribe((state, prev) => {
      if (state.character?.name !== prev.character?.name || state.character?.level !== prev.character?.level) server?.refreshIdentity();
    });
    instance = server;
  } else {
    instance = createLocalBackend();
  }
  return instance;
}

/** Серверный адаптер целиком (статус связи, события), если режим серверный. */
export function getServerBackend(): ServerBackend | null {
  getBackend();
  return server;
}

export type { GameBackend } from './backend';
export type { ConnectionStatus } from './serverBackend';
