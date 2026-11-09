import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/core/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      reporter: ['text-summary', 'text'],
      thresholds: { lines: 90 },
    },
  },
});
