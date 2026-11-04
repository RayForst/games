#!/usr/bin/env node
/**
 * Сквозной веб-прогон «Бойцовского клуба» в headless Chromium.
 *
 * Сценарий: создание персонажа → бой до конца → магазин → шахта (перемотка времени через
 * localStorage) → перезагрузка, сейв на месте. Скриншоты каждого шага — в папку `e2e-shots/`.
 *
 * Запуск: `npm run e2e` в `combat/` после `npx expo export --platform web` (нужен `dist/`).
 * Скрипт сам поднимает статический сервер под `/games/` (как на GitHub Pages, см. `experiments.baseUrl`).
 *
 * Переменные окружения:
 *   E2E_URL         — готовый адрес приложения (например, http://localhost:8081/games/); свой сервер не поднимается.
 *   E2E_DIST        — папка экспорта (по умолчанию `dist`).
 *   E2E_CHROMIUM    — путь к бинарнику Chromium (в облачном контейнере: /opt/pw-browsers/chromium-NNNN/chrome-linux64/chrome).
 *   E2E_PLAYWRIGHT  — путь к пакету playwright, если он не стоит в node_modules
 *                     (в контейнере: /opt/node22/lib/node_modules/playwright).
 *   E2E_SHOTS       — куда класть скриншоты (по умолчанию `e2e-shots`).
 *   E2E_HEADFUL=1   — показать окно браузера.
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BASE_PATH = '/games';
const DIST = path.resolve(ROOT, process.env.E2E_DIST || 'dist');
const SHOTS = path.resolve(ROOT, process.env.E2E_SHOTS || 'e2e-shots');
const SAVE_KEY = 'combat-save-v1';
const NAME = 'Тест Хмурый';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8',
};

function loadPlaywright() {
  const candidates = [process.env.E2E_PLAYWRIGHT, 'playwright', '/opt/node22/lib/node_modules/playwright'].filter(Boolean);
  for (const c of candidates) {
    try {
      return require(c);
    } catch (e) {
      if (!e || !/Cannot find module/.test(String(e.message))) throw e;
    }
  }
  throw new Error('Не найден пакет playwright. Поставь его (`npm i -D playwright`) или укажи путь в E2E_PLAYWRIGHT.');
}

/** Ищем Chromium: переменная окружения, затем тот, что знает playwright, затем глобальный кэш контейнера. */
function findChromium(chromium) {
  if (process.env.E2E_CHROMIUM) return process.env.E2E_CHROMIUM;
  try {
    const p = chromium.executablePath();
    if (p && fs.existsSync(p)) return undefined; // playwright сам знает путь
  } catch {
    /* ниже */
  }
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (fs.existsSync(cache)) {
    for (const dir of fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const p = path.join(cache, dir, sub);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return undefined;
}

/** Статический сервер экспорта под префиксом /games с SPA-фолбэком на index.html. */
function serveDist() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    throw new Error(`Нет ${DIST}/index.html — сначала \`npx expo export --platform web\`.`);
  }
  const index = fs.readFileSync(path.join(DIST, 'index.html'));
  const server = http.createServer((req, res) => {
    let url = decodeURIComponent((req.url || '/').split('?')[0]);
    if (url === BASE_PATH) url = BASE_PATH + '/';
    if (!url.startsWith(BASE_PATH + '/')) {
      res.writeHead(302, { Location: BASE_PATH + '/' });
      res.end();
      return;
    }
    const rel = url.slice(BASE_PATH.length + 1);
    const file = path.join(DIST, rel);
    if (rel && file.startsWith(DIST) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    res.end(index);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}${BASE_PATH}/` }));
  });
}

let step = 0;
async function shot(page, name) {
  step += 1;
  const file = path.join(SHOTS, `${String(step).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${path.relative(ROOT, file)}`);
}

function log(msg) {
  console.log(`▶ ${msg}`);
}

/** Видимые элементы: экраны под модалкой остаются в DOM, поэтому фильтруем по видимости. */
const visible = (loc) => loc.filter({ visible: true });
const button = (page, name) => visible(page.getByRole('button', { name, exact: typeof name === 'string' }));
const text = (page, t, exact = true) => visible(page.getByText(t, { exact }));

async function readSave(page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, SAVE_KEY);
}

async function writeSave(page, save) {
  await page.evaluate(([key, value]) => window.localStorage.setItem(key, JSON.stringify(value)), [SAVE_KEY, save]);
}

/** Со карты города: тап по зданию выбирает его, второй тап (или кнопка панели) — вход. */
async function enterBuilding(page, name, action) {
  await button(page, 'Карта мира').first().waitFor({ timeout: 15000 });
  const b = button(page, name).first();
  await b.click();
  const act = button(page, action).first();
  if (await act.isVisible().catch(() => false)) await act.click();
}

async function backToCity(page) {
  await visible(page.getByRole('button', { name: /^Назад: / })).first().click();
  await button(page, 'Карта мира').first().waitFor({ timeout: 15000 });
}

async function run() {
  fs.rmSync(SHOTS, { recursive: true, force: true });
  fs.mkdirSync(SHOTS, { recursive: true });

  const pw = loadPlaywright();
  const executablePath = findChromium(pw.chromium);
  let server = null;
  let url = process.env.E2E_URL;
  if (!url) ({ server, url } = await serveDist());
  if (!url.endsWith('/')) url += '/';
  log(`Приложение: ${url}${executablePath ? ` · Chromium: ${executablePath}` : ''}`);

  const browser = await pw.chromium.launch({
    headless: !process.env.E2E_HEADFUL,
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, locale: 'ru-RU' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  try {
    // 1. Создание персонажа.
    log('Создание персонажа');
    await page.goto(url, { waitUntil: 'networkidle' });
    await text(page, 'Войти в клуб').first().waitFor({ timeout: 30000 });
    await shot(page, 'create');
    await visible(page.getByPlaceholder('Например, Крыса Вася')).first().fill(NAME);
    await text(page, 'Воин').first().click();
    await button(page, 'Войти в клуб').first().click();
    await text(page, NAME).first().waitFor({ timeout: 15000 });
    await button(page, 'Карта мира').first().waitFor();
    await shot(page, 'city');
    const save0 = await readSave(page);
    if (!save0?.state?.character || save0.state.character.name !== NAME) throw new Error('Сейв не записался после создания персонажа');
    const kredits0 = save0.state.character.kredits;

    // 2. Арена: вызов на бой и бой до конца.
    log('Арена и бой');
    await enterBuilding(page, 'Арена', 'Войти');
    await button(page, 'Вызвать на бой').first().waitFor({ timeout: 15000 });
    await shot(page, 'arena');
    await button(page, 'Вызвать на бой').first().click();
    await button(page, 'Удар!').first().waitFor({ timeout: 15000 });
    await shot(page, 'fight-start');
    const zones = ['Голова', 'Корпус', 'Живот', 'Пояс', 'Ноги'];
    const blocks = ['Голова + корпус', 'Корпус + живот', 'Живот + пояс', 'Пояс + ноги'];
    let rounds = 0;
    while (rounds < 60) {
      if (await text(page, 'БОЙ ОКОНЧЕН').first().isVisible().catch(() => false)) break;
      await text(page, zones[rounds % zones.length]).first().click();
      await text(page, blocks[rounds % blocks.length]).first().click();
      const strike = button(page, 'Удар!').first();
      await strike.click();
      rounds += 1;
      // Ход соперника и перерисовка.
      await page.waitForTimeout(150);
    }
    if (!(await text(page, 'БОЙ ОКОНЧЕН').first().isVisible())) throw new Error(`Бой не закончился за ${rounds} раундов`);
    const outcome = (await text(page, /^(Победа!|Поражение|Ничья)$/).first().textContent()) || '?';
    log(`Бой окончен за ${rounds} раундов: ${outcome}`);
    await shot(page, 'fight-end');
    await button(page, 'Вернуться в зал').first().click();
    await button(page, 'Вызвать на бой').first().waitFor({ timeout: 15000 });
    await backToCity(page);

    // 3. Магазин: покупка самой дешёвой вещи, если хватает кредитов.
    log('Магазин');
    await enterBuilding(page, 'Магазин', 'Войти');
    await text(page, 'Скупка').first().waitFor({ timeout: 15000 });
    await shot(page, 'shop');
    const buy = button(page, 'Купить').first();
    if (await buy.isVisible().catch(() => false)) {
      await buy.click();
      await text(page, /— в рюкзаке$/).first().waitFor({ timeout: 5000 });
      await shot(page, 'shop-bought');
      const s = await readSave(page);
      if (!s.state.character.backpack?.length) throw new Error('После покупки рюкзак пуст');
    } else {
      log('Кредитов на покупку нет — пропускаем');
    }
    await backToCity(page);

    // 4. Шахта: смена, перемотка времени через сейв, сбор заработка.
    log('Шахта');
    await enterBuilding(page, 'Шахта', 'Спуститься');
    await button(page, /^Спуститься на \d+ ч$/).first().waitFor({ timeout: 15000 });
    await shot(page, 'mine');
    await button(page, /^Спуститься на \d+ ч$/).first().click();
    await text(page, 'Ты в шахте').first().waitFor({ timeout: 5000 });
    await shot(page, 'mine-working');
    const kreditsBeforeShift = (await readSave(page)).state.character.kredits;

    const save = await readSave(page);
    if (!save?.state?.mining) throw new Error('Смена не записалась в сейв');
    save.state.mining.startedAt -= (save.state.mining.hours + 1) * 3600 * 1000;
    await writeSave(page, save);
    await page.goto(url, { waitUntil: 'networkidle' });
    await button(page, 'Карта мира').first().waitFor({ timeout: 30000 });
    await enterBuilding(page, 'Шахта', 'Проверить');
    await text(page, 'Смена окончена').first().waitFor({ timeout: 15000 });
    await shot(page, 'mine-done');
    await button(page, /^Забрать \d+ кр\.$/).first().click();
    await button(page, /^Спуститься на \d+ ч$/).first().waitFor({ timeout: 5000 });
    await shot(page, 'mine-collected');
    const afterMine = await readSave(page);
    if (afterMine.state.mining) throw new Error('Смена не закрылась после сбора');
    if (afterMine.state.character.kredits <= kreditsBeforeShift) throw new Error('Кредиты за смену не начислены');
    log(`Кредиты: ${kredits0} → ${afterMine.state.character.kredits}`);
    await backToCity(page);

    // 5. Перезагрузка: сейв на месте.
    log('Перезагрузка');
    await page.reload({ waitUntil: 'networkidle' });
    await text(page, NAME).first().waitFor({ timeout: 30000 });
    await button(page, 'Карта мира').first().waitFor();
    const final = await readSave(page);
    if (final.state.character.name !== NAME) throw new Error('После перезагрузки персонаж другой');
    if (final.state.character.kredits !== afterMine.state.character.kredits) throw new Error('После перезагрузки кредиты разошлись');
    await shot(page, 'reloaded');

    const fatal = errors.filter((e) => !/favicon|ResizeObserver|Download the React DevTools/i.test(e));
    if (fatal.length) {
      console.log('Ошибки в консоли браузера:');
      for (const e of fatal) console.log('  ' + e.split('\n')[0]);
    }
    log('Готово: прогон прошёл');
  } catch (e) {
    await shot(page, 'FAILED').catch(() => {});
    if (errors.length) console.log('Консоль браузера:\n  ' + errors.map((x) => x.split('\n')[0]).join('\n  '));
    throw e;
  } finally {
    await browser.close();
    if (server) server.close();
  }
}

run().catch((e) => {
  console.error('✖ e2e упал:', e && e.message ? e.message : e);
  process.exit(1);
});
