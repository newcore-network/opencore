import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        'tests/**',
        'vitest.config.ts',
        'eslint.config.js',
      ],
    },
    exclude: ['node_modules', 'dist'],
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          setupFiles: ['./tests/setup.ts'],
          globals: true,
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          exclude: ['tests/integration/client/player.test.ts'],
          setupFiles: ['./tests/setup.ts'],
          globals: true,
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.test.ts'],
          setupFiles: ['./tests/setup.ts'],
          globals: true,
        },
      },
      {
        test: {
          name: 'benchmark-gold',
          include: [
            'benchmark/load/command-full.load.bench.ts',
            'benchmark/load/net-events-full.load.bench.ts',
            'benchmark/load/rpc-processor.load.bench.ts',
            'benchmark/load/player-lifecycle.load.bench.ts',
            'benchmark/load/tick.load.bench.ts',
            'benchmark/load/binary-service.load.bench.ts',
          ],
          setupFiles: ['./tests/setup.ts'],
          globals: true,
        },
      },
      {
        test: {
          name: 'benchmark-startup',
          include: ['benchmark/load/bootstrap.load.bench.ts'],
          setupFiles: ['./tests/setup.ts'],
          globals: true,
        },
      },
      {
        test: {
          name: 'benchmark-diagnostic',
          include: [
            'benchmark/load/commands.load.bench.ts',
            'benchmark/load/net-events.load.bench.ts',
            'benchmark/load/pipeline.load.bench.ts',
            'benchmark/load/core-events.load.bench.ts',
            'benchmark/load/guards.load.bench.ts',
            'benchmark/load/services.load.bench.ts',
            'benchmark/load/player-manager.load.bench.ts',
            'benchmark/load/throttle.load.bench.ts',
          ],
          setupFiles: ['./tests/setup.ts'],
          globals: true,
        },
      },
      {
        test: {
          name: 'benchmark-soak',
          include: ['benchmark/load/stress-test.load.bench.ts'],
          setupFiles: ['./tests/setup.ts'],
          globals: true,
        },
      },
    ],
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        useDefineForClassFields: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
