// Сжимает мастера иконок из art/icons-src в assets (WebP с альфой) и генерирует реестр src/ui/icons.generated.ts.
// Запуск: npm run icons. Мастера: art/icons-src/<id>.png (предметы) и art/icons-src/ui/<name>.png (интерфейс).
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_ITEMS = path.join(root, 'art/icons-src');
const SRC_UI = path.join(root, 'art/icons-src/ui');
const OUT_ITEMS = path.join(root, 'assets/items');
const OUT_UI = path.join(root, 'assets/ui');
const REGISTRY = path.join(root, 'src/ui/icons.generated.ts');

const ITEM_SIZE = 512;
const UI_SIZE = 256;

async function listPng(dir) {
  const names = await readdir(dir).catch(() => []);
  return names.filter((n) => n.toLowerCase().endsWith('.png')).sort();
}

async function convert(src, out, size) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(out);
}

async function catalogIds() {
  const ts = await readFile(path.join(root, 'src/game/items.ts'), 'utf8');
  return [...ts.matchAll(/\bid:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);
}

async function main() {
  await mkdir(OUT_ITEMS, { recursive: true });
  await mkdir(OUT_UI, { recursive: true });

  const items = await listPng(SRC_ITEMS);
  const ui = await listPng(SRC_UI);
  const ids = await catalogIds();

  for (const file of items) await convert(path.join(SRC_ITEMS, file), path.join(OUT_ITEMS, file.replace(/\.png$/i, '.webp')), ITEM_SIZE);
  for (const file of ui) await convert(path.join(SRC_UI, file), path.join(OUT_UI, file.replace(/\.png$/i, '.webp')), UI_SIZE);

  const itemKeys = items.map((f) => f.replace(/\.png$/i, ''));
  const uiKeys = ui.map((f) => f.replace(/\.png$/i, ''));

  const lines = [
    '// Сгенерировано scripts/icons.mjs — не править руками, запускать `npm run icons`.',
    "import type { ImageSourcePropType } from 'react-native';",
    '',
    '/** Иконки предметов по id из каталога. */',
    'export const ITEM_ICONS: Record<string, ImageSourcePropType> = {',
    ...itemKeys.map((k) => `  '${k}': require('../../assets/items/${k}.webp'),`),
    '};',
    '',
    '/** Иконки интерфейса. */',
    'export const UI_ICONS = {',
    ...uiKeys.map((k) => `  '${k}': require('../../assets/ui/${k}.webp') as ImageSourcePropType,`),
    '} as const;',
    '',
    'export type UiIconName = keyof typeof UI_ICONS;',
    '',
  ];
  await writeFile(REGISTRY, lines.join('\n'));

  const missing = ids.filter((id) => !itemKeys.includes(id));
  const extra = itemKeys.filter((k) => !ids.includes(k));
  console.log(`items: ${itemKeys.length} → ${path.relative(root, OUT_ITEMS)} (${ITEM_SIZE}px), ui: ${uiKeys.length} → ${path.relative(root, OUT_UI)} (${UI_SIZE}px)`);
  if (missing.length) console.log('Нет иконки для предметов из каталога:', missing.join(', '));
  if (extra.length) console.log('Файлы без предмета в каталоге:', extra.join(', '));
  if (!missing.length && !extra.length) console.log('Каталог и иконки совпадают полностью.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
