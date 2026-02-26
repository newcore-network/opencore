# Benchmark System – OpenCore Framework

A comprehensive benchmark suite designed to measure the performance, scalability, and internal overhead of the OpenCore framework under realistic and stress conditions.

This repository focuses on **measurable data**, not marketing numbers.

---

## 📋 Description

The benchmark system evaluates OpenCore in two complementary dimensions:

1. **Core Benchmarks (Tinybench)**  
   Pure framework internals, without FiveM dependencies.

2. **Load Benchmarks (Vitest)**  
   Simulated FiveM-like workloads with multiple virtual players, commands, and net events.

---

## 🏗️ Architecture

### Core Benchmarks (Tinybench)

Benchmarks targeting internal building blocks:

- **MetadataScanner** – decorator scanning & reflection
- **Dependency Injection** – tsyringe resolution cost
- **Zod Validation** – simple, complex and nested schemas
- **RateLimiterService** – key-based throttling under load
- **AccessControlService** – rank & permission checks
- **CoreEventBus** – event dispatch with variable handlers
- **Decorators** – metadata definition & read overhead
- **ParallelCompute** – sync vs parallel compute utilities
- **BinaryService** – JSON serialization, buffer splitting, pending request management, event dispatch
- **SchemaGenerator** – automatic Zod schema generation from TypeScript types, tuple processing
- **EntitySystem** – state management, metadata CRUD, snapshot/restore
- **AppearanceValidation** – ped appearance data validation at varying complexity
- **EventInterceptor** – DevMode circular buffer, filtering, statistics, listener notification
- **RuntimeConfig** – runtime options resolution and validation across modes

### Load Benchmarks (Vitest)

FiveM-like load simulation with increasing concurrency:

- **Commands** – simple, validated, concurrent, end-to-end
- **Net Events** – serialization, validation, latency injection
- **Guards & Throttle** – permission and rate enforcement
- **Event Bus** – handler fan-out under concurrency
- **Bootstrap** – controller & metadata initialization
- **Pipeline** – full execution chain
- **Player Lifecycle** – bind / unbind / link operations
- **Stress Tests** – mixed scenarios with ticks, commands and events
- **BinaryService** – serialization throughput, response parsing, buffer splitting, pending request lifecycle
- **RPC Processor** – schema generation, validation pipeline, concurrent RPCs, error paths

---

## 🚀 Usage

### Installation

```bash
pnpm install
```

### Run Benchmarks

#### Core Benchmarks

```bash
pnpm bench:core
# or
pnpm bench --core
```

#### Load Benchmarks

```bash
pnpm bench:load
```

#### Full Suite

```bash
pnpm bench:all
```

---

## 📊 Reports

All runs generate reports in `benchmark/reports/`:

- **`.txt`** – human-readable summary
- **`.json`** – machine-readable (CI, regression tracking)
- **`.html`** – interactive visual report

Load benchmarks also maintain a rolling metrics file:

```
benchmark/reports/.load-metrics.json
```

These files are considered **local artifacts** and are typically gitignored.

---

## 📈 Latest Benchmark Results

**Framework version:** `1.0.0-beta.1`  
**Run date:** Feb 26, 2026 (`2026-02-26T19:59:41.545Z`)  
**Environment:** Local development machine (results vary by hardware)

> ⚠️ The following is a **snapshot**, not a guarantee.  
> Always consult the generated reports for authoritative data.

> ℹ️ Some scenarios in this run report `0.00 ops/sec` because they were not exercised in this environment/configuration.

---

### 🔹 Core Benchmarks (Tinybench)

| Component | Throughput | Mean | p95 |
| --- | --- | --- | --- |
| EventInterceptor - getStatistics (1000 events) | ~17.78M ops/sec | ~0.056 us | ~0.087 us |
| RuntimeConfig - resolve CORE mode | ~10.49M ops/sec | ~0.095 us | ~0.107 us |
| Decorators - define metadata (Command) | ~6.92M ops/sec | ~0.145 us | ~0.247 us |
| RateLimiter - single key check | ~3.06M ops/sec | ~0.327 us | ~0.463 us |
| EventBus - multiple event types | ~2.57M ops/sec | ~0.390 us | ~0.570 us |
| DI - resolve simple service | ~1.78M ops/sec | ~0.560 us | ~0.769 us |
| BinaryService - full round-trip (serialize + parse + classify) | ~664K ops/sec | ~1.505 us | ~1.529 us |
| SchemaGenerator - batch 50 methods | ~406 ops/sec | ~2.46 ms | ~12.86 ms |
| BinaryService - classify response type (ok/error/event) | ~18.25M ops/sec | ~0.055 us | ~0.076 us |

---

### 🔹 Load Benchmarks (Vitest)

| Scenario | Players | Throughput | Mean | p95 | p99 | Error Rate |
| --- | --- | --- | --- | --- | --- | --- |
| Commands - 500 players (simple) | 500 | ~80.14K ops/sec | ~0.132 ms | ~0.226 ms | ~0.348 ms | 0% |
| Commands - 500 players (validated) | 500 | ~4.78M ops/sec | ~0.0037 ms | ~0.0080 ms | ~0.0113 ms | 0% |
| Commands - 500 players (concurrent) | 500 | ~6.31K ops/sec | ~41.13 ms | ~76.00 ms | ~78.47 ms | 0% |
| Pipeline - simple (500 players) | 500 | ~92.04K ops/sec | ~0.130 ms | ~0.205 ms | ~0.249 ms | 0% |
| Pipeline - validated (500 players) | 500 | ~4.79M ops/sec | ~0.0110 ms | ~0.0242 ms | ~0.0584 ms | 0% |
| Pipeline - full (500 players) | 500 | ~2.34M ops/sec | ~0.0050 ms | ~0.0106 ms | ~0.0330 ms | 0% |
| RPC - schema generation simple (500 methods) | 500 | ~29.30K ops/sec | ~0.185 ms | ~0.227 ms | ~0.482 ms | 0% |
| RPC - schema generation complex (500 methods) | 500 | ~705.37K ops/sec | ~0.195 ms | ~0.335 ms | ~0.455 ms | 0% |
| RPC - concurrent RPCs (500 parallel) | 500 | ~251.10K ops/sec | ~1.03 ms | ~1.83 ms | ~1.97 ms | 0% |
| RPC - full pipeline (500 ops) | 500 | ~42.26K ops/sec | ~0.099 ms | ~0.144 ms | ~0.206 ms | 0% |
| RPC - validation error path (500 ops) | 500 | 0.00 ops/sec | ~0.042 ms | ~0.077 ms | ~0.128 ms | 100% |

#### Quick takeaways

- Validated command and pipeline paths stay in microseconds at 500 players in this run.
- The dominant latency outlier is `Commands - concurrent`, which intentionally stresses queueing/scheduling behavior.
- RPC concurrent scenarios remain sub-2ms at p95 with zero error rate in successful-path tests.

---

## 📁 Directory Structure

```
benchmark/
├── core/          # Tinybench benchmarks
├── load/          # Vitest load benchmarks
├── utils/         # Shared benchmark utilities
├── reports/       # Generated reports (gitignored)
├── index.ts       # Entry point
└── README.md
```

---

## 🎯 Goals

This benchmark system exists to:

1. **Quantify performance** – not assume it
2. **Validate scalability** – 10 → 500 players
3. **Detect regressions** – across versions
4. **Expose bottlenecks** – early and visibly
5. **Support documentation** – with real numbers

---

## 📝 Notes

- Benchmarks are CPU-bound and hardware-dependent
- Latency-injected scenarios simulate network conditions
- Results should be compared **relatively**, not absolutely
- This system is intended for regression tracking, not marketing claims

---

## 📄 License

MPL-2.0 – see LICENSE in the project root
