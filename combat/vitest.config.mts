import { defineConfig } from 'vitest/config';

// Тесты покрывают чистую логику без React Native: игра в src/game и генератор портретов в src/ui.
export default defineConfig({
  test: {
    include: ['src/game/**/*.test.ts', 'src/ui/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
});
