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

**Framework version:** `0.2.2-beta.1`  
**Run date:** Dec 22, 2025  
**Environment:** Local development machine (results vary by hardware)

> ⚠️ The following is a **snapshot**, not a guarantee.  
> Always consult the generated reports for authoritative data.

---

### 🔹 Core Benchmarks (Tinybench)

| Component                                  | Throughput    | Mean Time |
| ------------------------------------------ | ------------- | --------- |
| Decorators – define metadata (Command)     | ~5.7M ops/sec | ~0.17 μs  |
| EventBus – multiple event types            | ~2.0M ops/sec | ~0.50 μs  |
| DI – resolve simple service                | ~1.7M ops/sec | ~0.58 μs  |
| Zod – simple schema validation             | ~2.5M ops/sec | ~0.40 μs  |
| ParallelCompute – overhead (sync, minimal) | ~4.7M ops/sec | ~0.21 μs  |

---

### 🔹 Load Benchmarks (Vitest)

#### Net Events

| Scenario                      | Players | Throughput     | p95 latency |
| ----------------------------- | ------- | -------------- | ----------- |
| Simple net event              | 50      | ~3.7M ops/sec  | ~0.002 ms   |
| Concurrent net events         | 500     | ~1.17M ops/sec | ~0.40 ms    |
| With simulated latency (5 ms) | 50      | ~2.5K ops/sec  | ~16 ms      |

#### Commands (Full Pipeline)

| Scenario             | Players | Throughput     | p95 latency |
| -------------------- | ------- | -------------- | ----------- |
| Validated command    | 100     | ~3.1M ops/sec  | ~0.004 ms   |
| Validated command    | 500     | ~14.0M ops/sec | ~0.004 ms   |
| Concurrent execution | 500     | ~25K ops/sec   | ~19 ms      |
| End-to-end pipeline  | 500     | ~47K ops/sec   | ~0.13 ms    |

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
