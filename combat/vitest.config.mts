import { defineConfig } from 'vitest/config';

// Тесты покрывают только чистую игровую логику в src/game (без React Native).
export default defineConfig({
  test: {
    include: ['src/game/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
});
