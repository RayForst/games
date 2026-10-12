# games — память проекта для Claude

Репозиторий мобильных игр на Expo. Владелец: Sergio (RayForst). Общение и UI на русском.
Стиль работы: вайб-кодинг — быстро получить результат, потом корректировать. Делать «охуенно», но MVP-шагами.

## Что здесь

- `combat/` — «Бойцовский клуб», клон combats.ru. Пошаговый PvP по зонам (5 зон удара, 4 блока), криты, увороты,
  броня, магазин, уровни. Сейчас одиночный режим против ботов, офлайн, сохранение в AsyncStorage.
  Полное описание механики и формул — `combat/README.md`.

## Стек и соглашения (combat)

- Expo SDK 57, React Native, TypeScript strict, Expo Router (маршруты в `src/app/`), zustand + persist, `@expo/vector-icons`.
- Только модули, которые есть в Expo Go: без нативных библиотек, иначе понадобится dev build.
- Чистая игровая логика в `src/game/` без React, покрыта vitest. Все формулы баланса — `src/game/formulas.ts`.
- Стор — `src/store/useGame.ts` (один файл, все действия возвращают `{ ok, reason }`).
- UI-кирпичи в `src/components/`, токены темы в `src/ui/theme.ts`. Тёмная «клубная» палитра: дерево, латунь, кровь.
- Выход из экрана боя — `router.dismissTo('/(tabs)/arena')`, не `replace` (иначе дублируются табы).
- `experiments.baseUrl = "/games"` в `app.json` нужен для GitHub Pages; на dev-сервер не влияет.
- Перед завершением задачи: `npm test`, `npm run typecheck`, `npm run lint` в `combat/`.

## Как запускать и проверять

- Телефон: `cd combat && npm install && npx expo start`, QR в Expo Go (`--tunnel`, если другая сеть).
- Браузер: `npx expo start --web`. Прогон в headless Chromium делался Playwright-скриптом
  (создание → бой → магазин → рюкзак → перезагрузка); при кликах по тексту фильтровать видимые элементы,
  потому что экраны под модалкой остаются в DOM.
- Веб-версия публикуется на https://rayforst.github.io/games/ workflow'ом `.github/workflows/deploy-web.yml`
  при пуше в `main` (окружение `github-pages` разрешает только `main`).
- Из облачной сессии Claude недоступны docs.expo.dev, api.expo.dev, github.io и ngrok; `npx expo install`
  не работает — версии брать из `node_modules/expo/bundledNativeModules.json` и ставить `npm install` напрямую.

## Git

- Коммитить от имени владельца: `Sergio Kolpachello <sergeikalpakov@gmail.com>` (настроено в `.git/config`),
  Claude — соавтор в трейлере. Владелец разрешил пушить в `main` напрямую.
- Рабочая ветка облачных сессий: `claude/fervent-franklin-ikmakg`, держать её равной `main`.

## Состояние и следующие шаги

- Сделано: MVP игры, тесты (29), деплой веб-версии, README с инструкциями по Expo Go, EAS Update, TestFlight.
- Открыто: графика. План владельца — генерировать ассеты нейросетями: иконки предметов и UI в 2D (Recraft / Scenario),
  персонажей через 3D (Tripo / Meshy / Rodin) с рендером в 2D из Blender по bpy-скрипту.
  Когда появятся картинки: иконки по `id` предмета из `src/game/items.ts`, портреты бойцов, фигура в `ZonePicker`.
- Идеи дальше: травмы, прочность вещей, кольца/амулеты, онлайн PvP, публикация в App Store через EAS.
