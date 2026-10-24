# games — память проекта для Claude

Репозиторий мобильных игр на Expo. Владелец: Sergio (RayForst). Общение и UI на русском.
Стиль работы: вайб-кодинг — быстро получить результат, потом корректировать. Делать «охуенно», но MVP-шагами.

## Что здесь

- `combat/` — «Бойцовский клуб», клон combats.ru. Пошаговый PvP по зонам (5 зон удара, 4 блока), криты, увороты,
  броня, магазин, уровни. Сейчас одиночный режим против ботов, офлайн, сохранение в AsyncStorage.
  Полное описание механики и формул — `combat/README.md`.

## Идея, интерфейс, лор

- Сеттинг: позднее средневековье, дарк-фэнтези, реализм (не 2000-е, не советское) — для мира, графики и промптов.
  Персонажи при этом — «быдло-подход»: дворовые клички и гопницкий говор, намеренный контраст (см. LORE.md).
- `LORE.md` — идея проекта, тон, принципы интерфейса, мир и бэклог задумок. Читать перед работой над UI,
  текстами и контентом. Новые идеи и решения владельца «какой должна быть игра» записывать туда, а не сюда.

## Стек и соглашения (combat)

- Expo SDK 57, React Native, TypeScript strict, Expo Router (маршруты в `src/app/`), zustand + persist, `@expo/vector-icons`.
- Только модули, которые есть в Expo Go: без нативных библиотек, иначе понадобится dev build.
- Чистая игровая логика в `src/game/` без React, покрыта vitest. Все формулы баланса — `src/game/formulas.ts`.
- Стор — `src/store/useGame.ts` (один файл, все действия возвращают `{ ok, reason }`).
- UI-кирпичи в `src/components/`, токены темы в `src/ui/theme.ts`. Тёмная «клубная» палитра: дерево, латунь, кровь.
- Навигация: табы `(tabs)/city` (хаб-карта, стартовый), `character`, `backpack`. Арена, магазин, лекарь и шахта —
  экраны стека (`src/app/arena.tsx`, `shop.tsx`, `healer.tsx`, `mine.tsx`), открываются с карты, наверху `BackBar`.
  Заведения и их точки на карте — `src/game/city.ts`, картинка `assets/map/city.webp`, компонент `CityMap`.
  Карта растянута на всю сцену (cover по высоте, лишнее листается), шапка и панель заведения лежат поверх;
  затемнения — `expo-linear-gradient`. Фон полосой с тёмными полями делать нельзя (см. `combat/art/MAP.md`).
- Выход из экрана боя — `router.dismissTo('/arena')`, не `replace` (иначе дублируются экраны).
- Шахта — офлайн-доход: `src/game/mine.ts`, в сторе `mining`, `startMining`/`collectMining`; во время смены бой запрещён.
- `experiments.baseUrl = "/games"` в `app.json` нужен для GitHub Pages; на dev-сервер не влияет.
- Перед завершением задачи: `npm test`, `npm run typecheck`, `npm run lint` в `combat/`.

## Как запускать и проверять

- Телефон: `cd combat && npm install && npx expo start`, QR в Expo Go (`--tunnel`, если другая сеть).
- Браузер: `npx expo start --web`. Прогон в headless Chromium делался Playwright-скриптом
  (создание → бой → магазин → рюкзак → перезагрузка); при кликах по тексту фильтровать видимые элементы,
  потому что экраны под модалкой остаются в DOM. Playwright стоит глобально
  (`/opt/node22/lib/node_modules/playwright`), Chromium запускать с `--no-sandbox`.
- В облачном контейнере Metro не видит изменения файлов: после правок перезапускать dev-сервер
  (`fuser -k 8081/tcp`, не `pkill -f "expo start"` — он убьёт и свой шелл).
- Веб-версия публикуется на https://rayforst.github.io/games/ workflow'ом `.github/workflows/deploy-web.yml`
  при пуше в `main` (окружение `github-pages` разрешает только `main`).
- Из облачной сессии Claude недоступны docs.expo.dev, api.expo.dev, github.io и ngrok; `npx expo install`
  не работает — версии брать из `node_modules/expo/bundledNativeModules.json` и ставить `npm install` напрямую.

## Git

- Коммитить от имени владельца: `Sergio Kolpachello <sergeikalpakov@gmail.com>` (настроено в `.git/config`),
  Claude — соавтор в трейлере. Владелец разрешил пушить в `main` напрямую.
- Рабочая ветка облачных сессий меняется от сессии к сессии (`claude/...`); пушить в неё и в `main`,
  держать их равными.

## Состояние и следующие шаги

- Сделано: MVP игры, тесты (29), деплой веб-версии, README с инструкциями по Expo Go, EAS Update, TestFlight.
  Экран персонажа переделан в «тамагочи» (аватар-заглушка `Avatar`, слоты по краям в `PaperDoll`,
  цифры в модалке `src/app/stats.tsx`).
- Иконки предметов и UI готовы (Scenario, GPT Image): мастера в `combat/art/icons-src/`, `npm run icons` жмёт их
  в WebP и генерирует `src/ui/icons.generated.ts`; показ через `ItemIcon` и `Kredits`. Подробности `combat/art/ICONS.md`.
- Открыто по графике: портрет вместо силуэта в `Avatar`, портреты бойцов, фигура в `ZonePicker`, иконки hp/exp.
  План владельца: персонажей через 3D (Tripo / Meshy / Rodin) с рендером в 2D из Blender по bpy-скрипту.
- Идеи дальше: травмы, прочность вещей, кольца/амулеты, онлайн PvP, публикация в App Store через EAS.
