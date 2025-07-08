import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        'cypress/',
        '*.config.js',
        '*.config.ts',
        'tests/',
        '**/*.test.js',
        '**/*.spec.js',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    include: ['tests/**/*.test.js', 'src/**/*.test.js'],
    exclude: ['node_modules/', 'dist/', 'build/', 'cypress/', 'backend_app/'],
  },
});
