// Синтез звуков боя и интерфейса без внешних ассетов: шум, синусы, огибающие, простые фильтры.
// Пишет WAV (моно, 16 бит, 22050 Гц) в assets/sfx. Запуск: npm run sfx. Сайты с ассетами из облака
// недоступны, а звуки из npm-паков — интерфейсные; удары, блоки и монеты дешевле собрать самим.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 22050;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'assets/sfx');

// Детерминированный шум, чтобы файлы не менялись от запуска к запуску.
let seed = 1234567;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296 - 0.5;
};

const buf = (sec) => new Float64Array(Math.round(sec * SR));
const mix = (dst, src, at = 0, gain = 1) => {
  const off = Math.round(at * SR);
  for (let i = 0; i < src.length && off + i < dst.length; i += 1) dst[off + i] += src[i] * gain;
  return dst;
};
/** Экспоненциальный спад: 1 → ~0 за `sec`. */
const decay = (n, sec) => Math.exp(-n / (SR * sec) * 5);
/** Атака за `sec`. */
const attack = (n, sec) => Math.min(1, n / (SR * sec));
const lowpass = (src, hz) => {
  const a = 1 - Math.exp((-2 * Math.PI * hz) / SR);
  let y = 0;
  return src.map((x) => (y += a * (x - y)));
};
const highpass = (src, hz) => {
  const lp = lowpass(src, hz);
  return src.map((x, i) => x - lp[i]);
};

const noise = (sec, dec, lp = 20000, hp = 0) => {
  let s = buf(sec).map((_, n) => rnd() * 2 * decay(n, dec));
  if (lp < 20000) s = lowpass(s, lp);
  if (hp > 0) s = highpass(s, hp);
  return s;
};
/** Тон с глиссандо f0→f1 и спадом. */
const tone = (sec, f0, f1, dec, shape = 'sine') => {
  const s = buf(sec);
  let phase = 0;
  for (let n = 0; n < s.length; n += 1) {
    const t = n / s.length;
    const f = f0 + (f1 - f0) * t;
    phase += (2 * Math.PI * f) / SR;
    const v = shape === 'saw' ? ((phase / Math.PI) % 2) - 1 : shape === 'square' ? (Math.sin(phase) > 0 ? 1 : -1) : Math.sin(phase);
    s[n] = v * decay(n, dec);
  }
  return s;
};

const sounds = {
  // Удар: глухой толчок и короткий шлепок.
  hit: () => {
    const s = buf(0.28);
    mix(s, tone(0.22, 110, 45, 0.09), 0, 0.9);
    mix(s, noise(0.16, 0.05, 1800), 0, 0.55);
    return s;
  },
  // Крит: тот же удар, но тяжелее, с металлическим звоном и хвостом.
  crit: () => {
    const s = buf(0.55);
    mix(s, tone(0.35, 90, 35, 0.14), 0, 1);
    mix(s, noise(0.25, 0.07, 2600), 0, 0.7);
    mix(s, tone(0.3, 2600, 2400, 0.05), 0.01, 0.25);
    mix(s, tone(0.3, 3400, 3300, 0.04), 0.012, 0.18);
    mix(s, noise(0.5, 0.25, 900), 0.05, 0.12);
    return s;
  },
  // Блок: стук по щиту, сухо и коротко.
  block: () => {
    const s = buf(0.22);
    mix(s, tone(0.18, 420, 300, 0.035), 0, 0.8);
    mix(s, noise(0.08, 0.02, 4000, 300), 0, 0.5);
    mix(s, tone(0.15, 180, 120, 0.06), 0, 0.4);
    return s;
  },
  // Уворот: свист воздуха, тон уходит вниз.
  dodge: () => {
    const n = buf(0.3).map((_, i) => rnd() * 2 * attack(i, 0.04) * decay(i, 0.12));
    const s = buf(0.3);
    const hp = highpass(n, 500);
    mix(s, lowpass(hp, 2200), 0, 0.6);
    mix(s, lowpass(highpass(noise(0.3, 0.14), 300), 900), 0.06, 0.35);
    return s;
  },
  // Монеты: два металлических щелчка.
  coin: () => {
    const s = buf(0.45);
    for (const [at, g] of [[0, 1], [0.09, 0.8]]) {
      mix(s, tone(0.3, 2250, 2250, 0.08), at, 0.5 * g);
      mix(s, tone(0.3, 3380, 3380, 0.06), at, 0.3 * g);
      mix(s, tone(0.2, 4500, 4500, 0.03), at, 0.15 * g);
    }
    return s;
  },
  // Победа: низкий трезвучный рёв, нарастает и гаснет, с гулом толпы.
  win: () => {
    const s = buf(1.4);
    for (const f of [110, 165, 220, 111.5]) {
      const t = tone(1.4, f, f, 0.9, 'saw').map((v, i) => v * attack(i, 0.25));
      mix(s, lowpass(t, 900), 0, 0.22);
    }
    mix(s, lowpass(noise(1.2, 0.6), 700).map((v, i) => v * attack(i, 0.3)), 0.1, 0.25);
    return s;
  },
  // Поражение: два тона вниз, глухо, с дрожью.
  lose: () => {
    const s = buf(1.3);
    const a = tone(0.6, 196, 170, 0.5).map((v, i) => v * (1 + 0.08 * Math.sin((2 * Math.PI * 6 * i) / SR)));
    const b = tone(0.9, 147, 110, 0.7).map((v, i) => v * (1 + 0.1 * Math.sin((2 * Math.PI * 5 * i) / SR)));
    mix(s, lowpass(a, 800), 0, 0.6);
    mix(s, lowpass(b, 700), 0.45, 0.7);
    mix(s, lowpass(noise(1.0, 0.5), 400), 0.4, 0.12);
    return s;
  },
  // Новый уровень: три ноты вверх и аккорд.
  levelup: () => {
    const s = buf(1.2);
    const notes = [220, 330, 440];
    notes.forEach((f, i) => {
      mix(s, tone(0.35, f, f, 0.18), i * 0.14, 0.4);
      mix(s, tone(0.35, f * 2, f * 2, 0.12), i * 0.14, 0.12);
    });
    for (const f of [220, 277, 330, 440]) mix(s, tone(0.8, f, f, 0.45).map((v, i) => v * attack(i, 0.05)), 0.42, 0.18);
    return s;
  },
  // Сообщение в чате: короткая нота с деревянным щелчком.
  message: () => {
    const s = buf(0.25);
    mix(s, tone(0.2, 880, 860, 0.07), 0, 0.4);
    mix(s, noise(0.05, 0.015, 3000, 400), 0, 0.3);
    return s;
  },
};

function wav(samples) {
  let peak = 0;
  for (const v of samples) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0 ? 0.85 / peak : 1;
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i += 1) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] * gain)) * 32767), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

await mkdir(out, { recursive: true });
for (const [name, make] of Object.entries(sounds)) {
  const file = wav(make());
  await writeFile(path.join(out, `${name}.wav`), file);
  console.log(`${name}.wav ${(file.length / 1024).toFixed(1)} KB`);
}
