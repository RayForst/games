import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ChatMessage } from '@/game/chat';
import type { Guild } from '@/game/guild';
import type { Role } from '@/game/roles';

// Хранилище — один JSON-файл. Базы нет нарочно: сервер должен подниматься одной командой.
// Запись отложенная (debounce) и атомарная (tmp + rename), чтобы падение посреди записи не портило файл.

export interface User {
  id: string;
  /** sha256 от токена устройства: сам токен на сервере не лежит. */
  tokenHash: string;
  name: string;
  role: Role;
  level: number;
  rating: number;
  guildId: string | null;
  createdAt: number;
  lastSeenAt: number;
  /** До какого момента заткнут; null — говорит. */
  mutedUntil: number | null;
}

/** Сообщение в ленте. У канала «Гильдия» помним, чьей гильдии оно: на телефон это поле не уходит. */
export type StoredMessage = ChatMessage & { guildId?: string };

export interface State {
  version: 1;
  users: User[];
  messages: StoredMessage[];
  guilds: Guild[];
  /** Заявки в гильдии: id гильдии → id просящихся. */
  applications: Record<string, string[]>;
}

export function emptyState(): State {
  return { version: 1, users: [], messages: [], guilds: [], applications: {} };
}

export interface Store {
  state: State;
  /** Отметить изменение: запись на диск произойдёт чуть позже одной порцией. */
  touch(): void;
  /** Записать немедленно (на выходе и в тестах). */
  flush(): void;
}

/** Хранилище в памяти: для тестов и как база для файлового. */
export function memoryStore(initial: State = emptyState()): Store {
  return { state: initial, touch() {}, flush() {} };
}

export function fileStore(path: string, delayMs = 200): Store {
  let state = emptyState();
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<State>;
    state = {
      version: 1,
      users: Array.isArray(raw.users) ? raw.users : [],
      messages: Array.isArray(raw.messages) ? raw.messages : [],
      guilds: Array.isArray(raw.guilds) ? raw.guilds : [],
      applications: raw.applications && typeof raw.applications === 'object' ? raw.applications : {},
    };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  let timer: NodeJS.Timeout | null = null;
  const write = () => {
    timer = null;
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, JSON.stringify(store.state));
    renameSync(tmp, path);
  };
  const store: Store = {
    state,
    touch() {
      if (!timer) timer = setTimeout(write, delayMs);
    },
    flush() {
      if (timer) clearTimeout(timer);
      write();
    },
  };
  return store;
}
