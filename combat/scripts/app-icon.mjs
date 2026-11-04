// Иконка приложения и сплэш из имеющихся ассетов: кулаки на тёмном фоне клуба.
// Запуск: node scripts/app-icon.mjs. Перезаписывает assets/icon.png, splash-icon.png и android-иконки.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'art/icons-src/ui/fists.png');
const bg = { r: 0x14, g: 0x10, b: 0x0c, alpha: 1 };

async function compose(size, inner, background, out) {
  const fists = await sharp(src).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: fists, gravity: 'centre' }])
    .png()
    .toFile(out);
}

await compose(1024, 760, bg, path.join(root, 'assets/icon.png'));
await compose(1024, 700, { r: 0, g: 0, b: 0, alpha: 0 }, path.join(root, 'assets/splash-icon.png'));
// Android adaptive: передний план занимает центральные 2/3, фон отдельно.
await compose(1024, 560, { r: 0, g: 0, b: 0, alpha: 0 }, path.join(root, 'assets/android-icon-foreground.png'));
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: bg } }).png().toFile(path.join(root, 'assets/android-icon-background.png'));
const mono = await sharp(src).resize(560, 560, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: mono, gravity: 'centre' }])
  .greyscale()
  .png()
  .toFile(path.join(root, 'assets/android-icon-monochrome.png'));
await sharp(path.join(root, 'assets/icon.png')).resize(64, 64).png().toFile(path.join(root, 'assets/favicon.png'));
console.log('icon, splash, android icons, favicon: done');
