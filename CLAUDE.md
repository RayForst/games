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

## Карта фич (где что лежит)

- Кузница: прочность/заточка в `InventoryItem`, формулы в `items.ts` (`maxDurability`, `repairCost`, `upgradeCost`), износ `wearEquipment`.
- Травмы: `character.ts` (`rollInjury`, `activeInjury`, `cureCost`), штраф применяется в `deriveCharacter`.
- Умения: `perks.ts`, эффекты через `applyPerks` в `deriveStats`; выбор на экране персонажа (`perkChoices`).
- Пивная: `quests.ts`, доска в сторе `quests`, события через `track()`; слухи `dailyRumors`.
- Замок: `tournament.ts`, стор `tournament`, рейтинг `rating`/`rankFor`; экран `castle.tsx`.
- Именные соперники: `rivals.ts` (определения, реплики, выбор `pickRival`), первый слот зала через `newArena()` в сторе,
  счёт в `character.rivals`. Болотник лечит травмы (`INJURY_BOGWORT`).
- Трофеи: `loot.ts`. Статистика и достижения: `achievements.ts`, `character.ledger`, экран `stats.tsx`.
- Карта мира: `world.ts` (локации, дороги, `canTravel`), стор `travel`, прибытие в `tick()`; экран `world.tsx` (SVG-схема).
  Таб `(tabs)/city` рендерит город, `ForestHub` или `TravelHub` по `character.location` и `travel`.
- Дикие земли (лес, болото, руины, перевал): `wilds.ts` — `WILDS` (занятия, враги, шанс засады, надбавка уровня),
  ресурсы и рынок `marketPrice`, крафт (`POTION_HERBS`, `woodForRepair`), дорожные события `rollRoadEvent`.
  Стор: `gathering`, `pendingHaul`, `roadNews`; компонент `WildsHub` общий для всех; бой с контекстом `'forest'`
  (так называется и для других диких земель) возвращает в таб места. Локации открываются по `minLevel` в `world.ts`.
- Брод (`location === 'brod'`): `BrodHub`; арена с `venue: 'brod'` (уровень +1, награда ×1.3/×1.2 в `settle`), рынок
  `marketPrice(..., 'brod')`, караван — вторая работа `Mining.job = 'caravan'` (`jobRatePerHour`, засада `CARAVAN_AMBUSH`
  с `pendingHaul.resource = 'kredits'`). Экран `caravan.tsx` и `mine.tsx` через общий `JobPanel`.
- Иконки-заглушки: `scripts/gi-icons.mjs` → `src/ui/gi.generated.ts` (Game Icons, CC BY 3.0, через react-icons),
  компонент `GiIcon`, карта предмет→иконка `src/ui/giMap.ts`. Сайты с ассетами (opengameart, kenney, game-icons.net)
  из облака недоступны, npm доступен — брать оттуда.
- Чат: `chat.ts` (каналы, голоса местных `NPC_VOICES`, темы `matchTopic`, ответы `npcReplies`, доставка `deliverPending`),
  стор `chat`/`chatSeenAt`, действия `sendChat`, модерация `deleteChatMessage`/`muteAuthor`; экран `chat.tsx`,
  входы из шапки города, Брода и пивной. Сводка каждого боя уходит в канал «Арена» из `settle()`.
- Гильдии: `guild.ts` (структура, проверки, уровни/бонусы `guildPerks`, местные `NPC_GUILDS`, стычки `skirmishOpponent`,
  дневной пересчёт `dailyGuildUpdate`), стор `guild`/`npcGuilds`/`skirmish`/`skirmishes`, бой с контекстом `'guild'`
  возвращает на `guild.tsx`. Бонусы и слава считаются в `settle()`.
- Роли и ГМ: `roles.ts` (`Role`, `Permission`, `can`, слово ключника), стор `account`, действия `gm*`; экран `admin.tsx`
  (вход с экрана персонажа). Любая новая служебная кнопка — через `need('permission')` в сторе и `can()` в UI.
- Кольца, амулеты, двуручники: слоты `ring1`/`ring2`/`amulet` в `types.ts` (`ItemSlot` каталога ≠ `Slot` экипировки,
  `slotsForItem`/`itemSlotOf`), флаг `twoHanded` в `ItemDef`; выбор слота и конфликт щит/двуручник — `targetSlot`,
  `handsConflict`, `prepareEquip` в `character.ts` (стор `equip` снимает лишнее сам, `canEquip` запрещает). Кукла —
  `PaperDoll` (амулет слева, пара колец справа), фильтры магазина — `FILTERS` в `shop.tsx`.
- Портреты: `src/ui/portrait.ts` (черты по сиду-имени, `RIVAL_PORTRAITS` по `rivalId`, кэш `portraitSpec`), компонент
  `Portrait` (SVG, пропсы `seed`, `rivalId`, `size`, `hpRatio`, `injured`, `tight` для квадратных карточек); стоит в
  `Avatar`, `FighterCard` и списке арены. Новая черта — новое поле в `PortraitSpec`, слой в `Portrait.tsx` и тест.
- Сервер (чат, гильдии, роли): `server/` (Node 22, `ws`, JSON-файл; `npm run dev`, `ADMIN_SECRET`), импортирует правила из
  `combat/src/game/`. Контракт `src/net/backend.ts`, протокол `src/net/protocol.ts`, адаптер `src/net/serverBackend.ts`,
  локальная реализация поверх стора `src/net/localBackend.ts`, выбор режима `src/net/index.ts` (`getBackend()`,
  `EXPO_PUBLIC_BACKEND_URL`; пусто — офлайн как раньше). Экраны пока зовут стор напрямую. Подробности `server/README.md`.
- Завершение боя — один хелпер `settle()` внутри стора (награда, уровень, умения, износ, рейтинг, турнир, трофей,
  задания, травма). Любая новая «после боя» логика добавляется туда.
- Сейвы: `persist.version` и `normalizeCharacter()` дописывают новые поля старым сохранениям — обновлять при каждом
  новом поле персонажа.

## Состояние и следующие шаги

- Сделано: MVP игры, тесты (29), деплой веб-версии, README с инструкциями по Expo Go, EAS Update, TestFlight.
  Экран персонажа переделан в «тамагочи» (аватар-заглушка `Avatar`, слоты по краям в `PaperDoll`,
  цифры в модалке `src/app/stats.tsx`).
- Иконки предметов и UI готовы (Scenario, GPT Image): мастера в `combat/art/icons-src/`, `npm run icons` жмёт их
  в WebP и генерирует `src/ui/icons.generated.ts`; показ через `ItemIcon` и `Kredits`. Подробности `combat/art/ICONS.md`.
- Портреты бойцов процедурные (SVG по имени, см. «Карту фич»), стоят в `Avatar`, бою и арене. Открыто по графике:
  фигура в `ZonePicker`, иконки hp/exp. План владельца: персонажей через 3D (Tripo / Meshy / Rodin) с рендером в 2D
  из Blender по bpy-скрипту — тогда `Portrait` заменяется картинками, не трогая экраны.
- Сделано за автономную сессию (см. `ROADMAP.md`): кузница, травмы, умения, пивная, замок с турниром и рейтингом,
  предметы 4–6 уровней, полировка боя, статистика и достижения, трофеи, иконка приложения, карта мира с дорогой,
  лес с ресурсами и скупкой, иконки-заглушки из Game Icons, Брод, чат с местными, гильдии, режим мастера игры.
- Идеи дальше: сервер (чат, гильдии, роли из учётки, потом PvP), кольца/амулеты, звук, публикация в App Store через EAS.
