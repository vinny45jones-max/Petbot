import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // первый динамический import (шаблоны писем) под параллельной нагрузкой ci:local превышал 5 с (finalize-paid, 11.11.2026)
    testTimeout: 15_000,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
