# Иконки предметов через Scenario

Цель: 31 иконка предметов из `src/game/items.ts` в одном стиле + несколько иконок интерфейса.
Файлы кладём в `combat/assets/items/<id>.png`, где `<id>` — id предмета из каталога (например `knife.png`).
Формат: PNG, прозрачный фон, квадрат (генерировать 1024×1024, в игру пойдут 512 и 256), предмет занимает ~80 % кадра, по центру.

## Стиль (один на всё)

Сеттинг из `LORE.md`: средневековое дарк-фэнтези, реализм. Для иконок:

- Реалистичная живописная подача, как концепт-арт к мрачной RPG: правдоподобные материалы, вес, износ.
  Не пиксель-арт, не flat, не мультяшность.
- Тёмная приглушённая палитра, холодный металл и тёплая кожа, тёплые блики от свечи, мягкая тень под предметом.
- Ракурс 3/4, лёгкий наклон. Один предмет в кадре, без рук и персонажей.
- Износ: царапины, потёртая кожа, ржавчина на дешёвых вещах; дорогие чище и с деталями, но без блеска «из магазина».

## Порядок работы в Scenario

1. Аккаунт на https://scenario.com (Starter бесплатный, тренировка стилей в нём доступна; безлимит тренировок — с плана Creator).
   Перед релизом проверь, что твой план разрешает коммерческое использование.
2. **Референсы стиля.** Сначала без тренировки: в генераторе выбери актуальную модель (Scenario сейчас советует
   новые, например Nano Banana Pro или Seedream), введи промпт из таблицы ниже для 3–4 предметов, сделай по 4–8 вариантов,
   отбери 10–25 лучших картинок в одном духе. Это и есть датасет.
3. **Тренировка стиля.** Models → Train → Style. Загрузи отобранные картинки (не меньше 1024 px),
   в подписях описывай предмет, а не стиль: «rusty knife, leather grip», без слов «painterly», «3D», «anime».
   Так модель учит стиль по картинкам, а промпт потом управляет содержанием.
4. **Генерация набора.** Выбери обученный стиль, вставляй промпты из таблицы по одному. Настройки:
   квадрат 1024×1024, 4 варианта на предмет, одинаковый seed для похожих предметов (три пояса, три сапога),
   negative prompt из блока ниже. Если форма «уезжает», нарисуй силуэт в Sketch Tool и поставь
   Image-to-Image influence 10–25: форма держится, детали рисует модель.
5. **Фон.** На выбранном варианте: Post-processing → Remove Background → сохранить PNG с прозрачностью.
6. **Экспорт.** Скачай 1024 px PNG, переименуй в `<id>.png`, уменьшение до 512 сделаю скриптом при подключении.
7. Скинь папку с файлами (или закоммить в `combat/assets/items/`), дальше я подключаю их в магазин, рюкзак и куклу.

## Шаблон промпта

```
{предмет и детали}, dark fantasy game inventory item icon, realistic painterly render,
single object centered, three-quarter view, worn leather and cold dark iron, candlelight highlights,
subtle drop shadow, muted desaturated palette, isolated on plain neutral background
```

Negative prompt:

```
text, letters, watermark, logo, multiple items, hands, character, person, cropped, blurry,
busy background, scene, frame, border, pixel art, flat vector, cartoon, anime, glossy plastic, neon
```

Размер: в Scenario генерировать **1024×1024** (квадрат 1:1), PNG, фон убрать через Remove Background.
В игре иконки показываются 56–72 pt, так что при подключении уменьшу до 512 и 256.

## Один промпт для GPT Image (Scenario, модель GPT Image 2.5)

У GPT-моделей нет negative prompt и настроек стиля: всё одним текстом, запреты внутри, референсы прикрепляются
к промпту и задают стиль. Настройки: Dimensions → квадрат 1024×1024, Background → Transparent,
Quality → High, Image Count → 2–3 на предмет (10 вариантов одного ножа жгут кредиты впустую).
Референсы держать одни и те же для всех 31 предметов, менять только часть в фигурных скобках.

```
Match the exact art style, lighting, camera angle and rendering of the reference images:
a realistic painterly dark fantasy game inventory icon. Generate ONE item only:
{rusty kitchen knife with a worn wooden handle and a chipped blade}.
Single object centered, three-quarter view with a slight tilt, filling about 80% of the frame,
worn leather and cold dark iron, warm candlelight highlights, soft shadow under the object,
muted desaturated palette, transparent background.
No text, no letters, no watermark, no hands, no characters, no extra items, no frame or border,
no cartoon or flat vector look.
```

Части в скобках берутся из таблицы ниже (столбец «Промпт»).

## Предметы (31)

Промпт — только первая часть шаблона, остальное добавляется ко всем одинаково.

### Оружие (weapon)

| id | Название | Промпт (English) |
| --- | --- | --- |
| `knife` | Нож | rusty kitchen knife with worn wooden handle, chipped blade |
| `club` | Дубина | heavy wooden club with knots and a few bent nails, cracked bark |
| `dagger` | Кинжал | slim steel dagger with dark leather-wrapped grip, sharp polished blade |
| `short-sword` | Короткий меч | short straight sword, plain iron crossguard, scuffed blade |
| `hatchet` | Топорик | one-handed hatchet, chipped iron head on a worn wooden haft |
| `rapier` | Рапира | elegant rapier with swept brass hilt, thin bright blade |
| `sword` | Меч | long arming sword with brass pommel, polished steel blade, leather grip |
| `mace` | Булава | iron flanged mace with heavy head on a wrapped handle |
| `battle-axe` | Боевой топор | large two-handed battle axe with wide curved blade, reinforced haft |

### Щиты (shield)

| id | Название | Промпт |
| --- | --- | --- |
| `buckler` | Баклер | small round iron buckler with central boss, dents and scratches |
| `round-shield` | Круглый щит | round wooden shield with iron rim and boss, faded red paint |
| `tower-shield` | Башенный щит | tall rectangular tower shield, riveted iron plates, heavy and battered |

### Шлемы (helmet)

| id | Название | Промпт |
| --- | --- | --- |
| `cap` | Кожаная шапка | simple brown leather skullcap with stitching |
| `iron-helm` | Железный шлем | plain iron helmet with nasal guard, dull dented metal |
| `great-helm` | Рыцарский шлем | knight great helm with narrow visor slit, polished steel with brass trim |

### Броня (armor)

| id | Название | Промпт |
| --- | --- | --- |
| `jacket` | Кожаная куртка | worn brown leather jacket with buckles, scuffed |
| `chainmail` | Кольчуга | chainmail shirt of dark iron rings, laid flat |
| `brigandine` | Бригантина | brigandine vest, dark fabric with riveted brass studs over hidden plates |
| `plate` | Латы | full steel plate cuirass with brass edging, polished with small dents |

### Перчатки (gloves)

| id | Название | Промпт |
| --- | --- | --- |
| `leather-gloves` | Кожаные перчатки | pair of worn brown leather gloves |
| `studded-gloves` | Перчатки с шипами | pair of black leather gloves with iron spikes on the knuckles |
| `iron-gloves` | Железные перчатки | pair of iron gauntlets with articulated plates |

### Пояса (belt)

| id | Название | Промпт |
| --- | --- | --- |
| `leather-belt` | Кожаный пояс | simple brown leather belt with iron buckle, coiled |
| `studded-belt` | Пояс с бляхами | wide leather belt covered with round brass plates, coiled |
| `warrior-belt` | Пояс воина | heavy warrior belt with large ornate brass buckle and iron rings, coiled |

### Штаны (pants)

| id | Название | Промпт |
| --- | --- | --- |
| `cloth-pants` | Холщовые штаны | plain beige canvas trousers, patched and frayed, folded |
| `leather-pants` | Кожаные штаны | dark brown leather trousers with straps, folded |
| `chain-pants` | Кольчужные штаны | chainmail leggings of dark iron rings, folded |

### Сапоги (boots)

| id | Название | Промпт |
| --- | --- | --- |
| `bast-shoes` | Лапти | pair of woven bast shoes, pale braided bark fiber |
| `leather-boots` | Сапоги | pair of tall brown leather boots, worn soles |
| `iron-boots` | Латные сапоги | pair of steel plate boots with brass rivets |

## Иконки интерфейса (после предметов)

Тем же стилем, тоже 512×512 с прозрачным фоном:

| Файл | Что это | Промпт |
| --- | --- | --- |
| `ui/kredit.png` | кредиты | single tarnished brass coin with a fist emblem |
| `ui/hp.png` | здоровье | dark red heart made of leather with brass stitches |
| `ui/exp.png` | опыт | brass star medal on a short dark ribbon |
| `ui/fists.png` | «кулаки», пустой слот оружия | bare clenched fist wrapped in dirty bandages |
| `ui/healer.png` | лекарь | small brown glass bottle with cork and red liquid |
| `ui/slot-empty.png` | пустой слот | empty dark leather square pocket with brass corners |

Табы (Персонаж, Зал боя, Магазин, Рюкзак) пока остаются на Ionicons: там нужна монохромная векторная форма, а не живописная иконка.

## Что я сделаю, когда файлы будут

- Скрипт уменьшения до 512 px и проверки имён по каталогу (`id` без файла → предупреждение).
- Компонент `ItemIcon` с картой `id → require(...)` и фолбэком на иконку слота.
- Иконки в `ItemCard` (магазин, рюкзак) и в кукле экипировки на экране персонажа.
