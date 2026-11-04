import { fileStore } from './store';
import { createGameServer } from './server';

// Запуск: `npm run dev` (с перезапуском при правках) или `npm start`.
// Переменные: PORT, ADMIN_SECRET, DATA_FILE — см. README и .env.example.

const port = Number(process.env.PORT ?? 8787);
const dataFile = process.env.DATA_FILE ?? 'data/state.json';
const adminSecret = process.env.ADMIN_SECRET || undefined;

const store = fileStore(dataFile);
const server = createGameServer({ store, adminSecret });

server.http.listen(port, () => {
  console.log(`Бойцовский клуб: сервер на ws://localhost:${port}, состояние в ${dataFile}`);
  console.log(adminSecret ? 'ADMIN_SECRET задан: первый вошедший с ним станет админом.' : 'ADMIN_SECRET пуст: админа не будет, пока не задашь.');
  console.log(`Пользователей: ${store.state.users.length}, гильдий: ${store.state.guilds.length}, сообщений: ${store.state.messages.length}.`);
});

const stop = () => server.close().then(() => process.exit(0));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
