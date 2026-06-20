import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.ts', '**/*.test.mjs'],
    exclude: ['node_modules', 'dist', 'vendor', '.positive-byte-sessions', '.atomic-build-tmp'],
    environment: 'node',
    testTimeout: 30000,
  },
});
