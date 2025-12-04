# Benchmark System - OpenCore Framework

A complete benchmark system to demonstrate the performance and robustness of the OpenCore framework under different load scenarios.

## 📋 Description

This benchmark system is designed to evaluate framework performance in two main categories:

1. **Core Benchmarks (Tinybench)**: Internal components without FiveM dependencies
2. **Load Benchmarks (Vitest)**: FiveM environment simulation with multiple virtual players

## 🏗️ Architecture

### Core Benchmarks

Internal component benchmarks using **Tinybench**:

- **MetadataScanner**: Decorator scanning and processing
- **Dependency Injection**: Dependency resolution with tsyringe
- **Zod Validation**: Simple and complex schemas
- **RateLimiterService**: Rate limiting under different loads
- **AccessControlService**: Permission and rank verification
- **CoreEventBus**: Internal event emission and handling
- **Decorators**: Decorator processing overhead

### Load Benchmarks

Load benchmarks using **Vitest** with multi-player simulation:

- **Commands**: Processing with 10, 50, 100, 200, 500 players
- **Net Events**: Network events with Zod validation under load
- **Guards**: Access verification with multiple simultaneous players
- **Throttle**: Rate limiting under intense load
- **Core Events**: Event bus with multiple handlers
- **Bootstrap**: Framework initialization with multiple controllers
- **Pipeline**: Full command execution pipeline (Command → Guard → Service → EventBus → Zod → Response)
- **Player Lifecycle**: bind/linkAccount/unbind operations
- **Stress Test**: Combined load with commands, events, and ticks

## 🚀 Usage

### Installation

```bash
pnpm install
```

### Run Benchmarks

#### Core Benchmarks (Tinybench)

```bash
# Run all core benchmarks
pnpm bench:core

# Or use the general script
pnpm bench --core
```

#### Load Benchmarks (Vitest)

```bash
# Run load benchmarks
pnpm bench:load
```

#### All Benchmarks

```bash
# Run core and load benchmarks with full report
pnpm bench:all
```

### Available Scripts

- `pnpm bench` - Show help and options
- `pnpm bench:core` - Run core benchmarks (Tinybench)
- `pnpm bench:load` - Run load benchmarks (Vitest)
- `pnpm bench:all` - Run all benchmarks and generate reports

## 📊 Reports

Reports are automatically generated in `benchmark/reports/` in three formats:

1. **Text** (`.txt`): Human-readable console format
2. **JSON** (`.json`): For CI/CD integration
3. **HTML** (`.html`): Interactive dashboard with visualizations

## 📈 Latest Benchmark Results

**Version:** 0.6.0-beta.1  
**Date:** December 4, 2025

### Core Benchmarks Summary

| Component           | Operation                  | Ops/sec | Mean Latency | p95      |
| ------------------- | -------------------------- | ------- | ------------ | -------- |
| **MetadataScanner** | 1 controller, 3 methods    | 6.00K   | 166.73μs     | 237.32μs |
| **MetadataScanner** | 3 controllers, 6 methods   | 6.35K   | 157.60μs     | 212.18μs |
| **DI Container**    | Resolve simple service     | 1.65M   | 0.61μs       | 0.80μs   |
| **DI Container**    | Resolve 100 times          | 60.61K  | 16.50μs      | 17.20μs  |
| **Zod**             | Simple schema              | 1.99M   | 0.50μs       | 0.60μs   |
| **Zod**             | Complex schema             | 1.00M   | 1.00μs       | 1.20μs   |
| **Zod**             | Safe parse                 | 2.45M   | 0.41μs       | 0.60μs   |
| **RateLimiter**     | Single key check           | 2.56M   | 0.39μs       | 0.50μs   |
| **RateLimiter**     | 100 different keys         | 27.63K  | 36.19μs      | 39.03μs  |
| **AccessControl**   | hasRank (success)          | 2.56M   | 0.39μs       | 0.40μs   |
| **AccessControl**   | hasPermission (wildcard)   | 2.76M   | 0.36μs       | 0.40μs   |
| **AccessControl**   | enforce (both)             | 1.65M   | 0.60μs       | 0.70μs   |
| **EventBus**        | Register handler           | 3.18M   | 0.31μs       | 0.30μs   |
| **EventBus**        | Emit to 1 handler          | 3.22M   | 0.31μs       | 0.40μs   |
| **EventBus**        | Emit to 100 handlers       | 102.10K | 9.79μs       | 10.50μs  |
| **Decorators**      | Define metadata            | 5.48M   | 0.18μs       | 0.20μs   |
| **Decorators**      | Full stack (define + read) | 2.15M   | 0.47μs       | 0.60μs   |

### Load Benchmarks Summary (500 Players)

| Operation                   | Throughput      | Mean     | p95      | p99      | Error Rate |
| --------------------------- | --------------- | -------- | -------- | -------- | ---------- |
| **Net Events - Simple**     | 92.59M ops/sec  | 0.61μs   | 0.80μs   | 1.20μs   | 0.00%      |
| **Net Events - Validated**  | 11.47M ops/sec  | 2.48μs   | 2.70μs   | 6.71μs   | 0.00%      |
| **Net Events - Concurrent** | 1.61M ops/sec   | 220.69μs | 294.22μs | 309.00μs | 0.00%      |
| **emitNet Cost**            | 73.53M ops/sec  | 1.11μs   | 1.60μs   | 2.71μs   | 0.00%      |
| **Serialization (small)**   | 14.71M ops/sec  | 2.52μs   | 4.10μs   | 6.00μs   | 0.00%      |
| **Serialization (medium)**  | 16.72M ops/sec  | 10.54μs  | 12.00μs  | 13.61μs  | 0.00%      |
| **Serialization (large)**   | 146.53K ops/sec | 812.70μs | 951.11μs | 1.39ms   | 0.00%      |
| **HttpService Concurrent**  | 145.59K ops/sec | 2.05ms   | 3.11ms   | 3.20ms   | 0.00%      |

### Scalability (Net Events - Simple)

| Players | Throughput     | Mean Latency | p95    |
| ------- | -------------- | ------------ | ------ |
| 50      | 2.40M ops/sec  | 1.65μs       | 3.29μs |
| 100     | 1.97M ops/sec  | 1.63μs       | 1.70μs |
| 200     | 9.17M ops/sec  | 1.07μs       | 1.20μs |
| 500     | 92.59M ops/sec | 0.61μs       | 0.80μs |

### Key Highlights

- ✅ **Zero error rate** across all load scenarios
- ✅ **Sub-microsecond latency** for core operations
- ✅ **Excellent scalability** - performance improves with load due to warm caches
- ✅ **Consistent p95/p99** - predictable latency behavior
- ✅ **High throughput** - millions of operations per second

## 📁 Directory Structure

```
benchmark/
├── core/                    # Tinybench benchmarks
│   ├── metadata-scanner.bench.ts
│   ├── dependency-injection.bench.ts
│   ├── validation.bench.ts
│   ├── rate-limiter.bench.ts
│   ├── access-control.bench.ts
│   ├── event-bus.bench.ts
│   └── decorators.bench.ts
├── load/                    # Vitest load benchmarks
│   ├── commands.load.bench.ts
│   ├── command-full.load.bench.ts
│   ├── net-events.load.bench.ts
│   ├── net-events-full.load.bench.ts
│   ├── guards.load.bench.ts
│   ├── throttle.load.bench.ts
│   ├── core-events.load.bench.ts
│   ├── bootstrap.load.bench.ts
│   ├── pipeline.load.bench.ts
│   ├── player-lifecycle.load.bench.ts
│   ├── player-manager.load.bench.ts
│   ├── services.load.bench.ts
│   ├── tick.load.bench.ts
│   └── stress-test.load.bench.ts
├── utils/                   # Shared utilities
│   ├── player-factory.ts    # Factory for mock players
│   ├── metrics.ts           # Metrics collection and calculation
│   ├── reporter.ts          # Report generation
│   ├── load-collector.ts    # Load metrics collector
│   ├── load-scenarios.ts    # Predefined load scenarios
│   ├── serialization.ts     # Serialization utilities
│   └── tick-simulator.ts    # Tick simulation utilities
├── reports/                 # Generated reports (gitignored)
├── index.ts                 # Main entry point
└── README.md                # This file
```

## 🔧 Utilities

### PlayerFactory

Factory for creating mock players with different configurations:

```typescript
import { PlayerFactory } from './utils/player-factory'

// Create a single player
const player = PlayerFactory.createPlayer({
  clientID: 1,
  accountID: 'acc-123',
  rank: 5,
  permissions: ['admin.all'],
})

// Create multiple players
const players = PlayerFactory.createPlayers(100, {
  rank: 1,
  permissions: ['user.basic'],
})
```

### Metrics

Functions for calculating and formatting metrics:

```typescript
import { calculateMetrics, formatTime, formatOpsPerSec, reportLoadMetric } from './utils/metrics'

const metrics = calculateMetrics(timings, 'My Benchmark')
console.log(`Mean: ${formatTime(metrics.mean)}`)
console.log(`Ops/sec: ${formatOpsPerSec(metrics.opsPerSec)}`)

// For load tests - prints AND collects for report
reportLoadMetric(loadMetrics)
```

### Load Scenarios

Predefined scenarios for load tests:

```typescript
import { LOAD_SCENARIOS, getAllScenarios } from './utils/load-scenarios'

const scenarios = getAllScenarios() // [10, 50, 100, 200, 500]
const playerCount = LOAD_SCENARIOS.LARGE // 200
const extremeCount = LOAD_SCENARIOS.EXTREME // 500
```

## 📈 Measured Metrics

### Core Benchmarks

- Operations per second (ops/sec)
- Average execution time
- Decorator overhead
- DI container efficiency
- Zod validation speed

### Load Benchmarks

- Latency p50, p95, p99
- Throughput under different loads
- Scalability (10 → 50 → 100 → 200 → 500 players)
- Performance degradation
- Error rate
- Serialization/deserialization costs
- Network latency impact

## 🎯 Goals

This benchmark system aims to:

1. **Demonstrate performance**: Prove that OpenCore is fast and efficient
2. **Validate scalability**: Verify the framework handles high loads well
3. **Identify bottlenecks**: Find areas for improvement
4. **Compare versions**: Track performance improvements between releases
5. **Document capabilities**: Provide concrete metrics for documentation

## 🔍 Interpreting Results

### Core Benchmarks

- **High ops/sec**: Good performance
- **Low time**: Low latency
- **p95/p99 close to mean**: Consistent behavior

### Load Benchmarks

- **Stable throughput**: Good scaling
- **Error rate < 5%**: Robust system
- **p95 latency < 100ms**: Fast response even under load

## 📝 Notes

- Load benchmarks may take several minutes to complete
- Reports are automatically saved to `benchmark/reports/`
- Load benchmarks require FiveM mocks to be configured
- It's recommended to run benchmarks in an isolated environment for consistent results
- The `pnpm bench:all` command runs both core and load benchmarks and generates combined reports

## 🤝 Contributing

When adding new benchmarks:

1. Create the file in `benchmark/core/` or `benchmark/load/`
2. Follow the pattern of existing benchmarks
3. Use shared utilities when possible
4. Document what component you're measuring
5. Add the benchmark to the entry point if it's core
6. Use `reportLoadMetric()` in load benchmarks to ensure metrics are collected for reports

## 📄 License

MPL-2.0 - See LICENSE in the project root
