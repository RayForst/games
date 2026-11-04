import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    // `@/game/...` — чистая игровая логика из клиента; сервер не копирует формулы, а импортирует их.
    alias: { '@': new URL('../combat/src', import.meta.url).pathname },
  },
});
