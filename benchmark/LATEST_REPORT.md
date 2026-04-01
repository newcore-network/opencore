# OpenCore Framework Benchmark Report

Generated from:

- `benchmark/reports/benchmark-2026-04-01T19-12-11-034Z.json`
- `benchmark/reports/benchmark-2026-04-01T19-12-11-030Z.txt`
- `benchmark/reports/.load-metrics.json`

Run metadata:

- Timestamp: `2026-04-01T19:03:36.782Z`
- Version: `1.0.6`

## Executive Summary

This run reflects the new benchmark strategy for OpenCore.

The benchmark suite is now split by value:

- `gold`: real framework feature paths
- `startup`: boot and registration cost
- `diagnostic`: low-level internals for tuning
- `soak`: longer-running stress checks

This matters because the previous suite mixed product-facing signals with synthetic internals. The new report is much easier to interpret for real servers.

Suite distribution in this run:

- `gold`: 227 results
- `startup`: 30 results
- `diagnostic`: 283 results
- `soak`: 11 results

## Diagnostic Summary

## What is working well

### 1. Gold benchmarks now measure actual framework value

The most useful benchmarks in this run are the ones that exercise real framework features:

- full command execution
- full net event handling
- RPC schema and dispatch paths
- player lifecycle churn
- tick handler cost
- binary transport paths
- bootstrap / startup registration

This is a large improvement over microbenchmarks that only measure metadata reads or helper internals.

### 2. Startup costs are visible and actionable

The startup suite gives useful numbers for:

- metadata scanning
- dependency injection setup
- schema generation
- bootstrap controller registration

This is useful for release quality and for understanding how fast a server resource graph can initialize.

### 3. Concurrency bottlenecks are now exposed honestly

The most important runtime signal in the new report is not the best-case path, but the degradation under contention.

That shows up clearly in:

- command concurrent execution
- tick parallel execution
- large payload binary serialization

These are meaningful server-facing signals.

## What still needs attention

### 1. Some diagnostic benchmarks still report zero iterations

Examples in this run:

- `DI - Resolve with 1 dependency`
- `DI - Resolve with 2 dependencies`
- `DI - Resolve with 3 dependencies`
- `DI - Resolve 100 times (complex)`
- several `AccessControl` success-path scenarios

These should either be fixed or removed from the primary diagnostic output. Right now they create noise and reduce trust in that part of the suite.

### 2. Some low-sample scenarios still have weak statistical value

Examples:

- `BinaryService - Buffer split + parse` scenarios with only `1` operation
- `BinaryService - Pending requests lifecycle` scenarios with only `2` operations
- connect/disconnect cycle scenarios with only `3` operations

These can still be useful as sanity checks, but their `p95` and `p99` are not as meaningful as the larger-sample runs.

### 3. Diagnostic still contains more data than decision-makers need

This is acceptable because `diagnostic` is now demoted, but it confirms the design decision:

- keep `gold` for product decisions
- keep `diagnostic` for tuning

## Final Diagnosis

OpenCore now has a benchmark system that is directionally correct for a framework runtime:

- it measures feature paths instead of mostly internal trivia
- it separates startup from hot paths
- it surfaces concurrency pain points instead of hiding them in averages
- it produces a report that can support engineering decisions

The main remaining cleanup is in the diagnostic tier, not in the gold suite.

## Key Results

## Gold Suite

### Commands

| Scenario | Throughput | p95 | Notes |
| --- | --- | --- | --- |
| `Command Full - Validated (100 players)` | `115.68K ops/sec` | `0.012ms` | Strong validated happy-path throughput |
| `Command Full - End-to-End (100 players)` | `863.50K ops/sec` | `0.0027ms` | Extremely cheap synthetic end-to-end path |
| `Command Full - Concurrent (100 players)` | `121.71 ops/sec` | `14.42ms` | Main contention signal |

Takeaway:

- happy-path command handling is strong
- concurrent saturation is where the runtime should be watched most closely

### Net Events

| Scenario | Throughput | p95 | Notes |
| --- | --- | --- | --- |
| `Net Events - Simple (10 players)` | `16.81K ops/sec` | `0.223ms` | base handler cost |
| `Net Events - Validated (10 players)` | `9.61K ops/sec` | `0.488ms` | validation overhead is visible |
| `Net Events - Full Event (small, 10 players)` | `74.42K ops/sec` | `0.029ms` | small payload path remains cheap |
| `Net Events - Full Event (medium, 10 players)` | `44.73K ops/sec` | `0.079ms` | moderate serialization cost |
| `Net Events - Full Event (large, 10 players)` | `27.68K ops/sec` | `0.113ms` | payload size starts to dominate |

Takeaway:

- payload size matters more than simple dispatch
- validated net events remain comfortably sub-millisecond in this run

### RPC

| Scenario | Throughput | p95 | Notes |
| --- | --- | --- | --- |
| `RPC - Schema generation simple (200 methods)` | `7.95K ops/sec` | `0.176ms` | strong simple-schema throughput |
| `RPC - Schema generation complex (200 methods)` | `3.06K ops/sec` | `0.400ms` | complex generation costs ~2-3x more |

Takeaway:

- RPC stays in a reasonable range even when schemas become more complex
- schema complexity is a real cost center in startup/registration paths

### Player Lifecycle

| Scenario | Throughput | p95 | Notes |
| --- | --- | --- | --- |
| `Player Lifecycle - Full Cycle (500 players)` | `200.55K ops/sec` | `0.0096ms` | strong lifecycle throughput |
| `Player Lifecycle - Concurrent Connections (500 players)` | `108.68K ops/sec` | `0.0046ms` | connection fan-out still healthy |
| `Player Lifecycle - Concurrent Disconnections (500 players)` | `1.83M ops/sec` | `0.00075ms` | disconnect path is very cheap |

Takeaway:

- lifecycle churn performs well
- connect cost is meaningfully higher than disconnect cost, as expected

### Tick Budget

| Scenario | Throughput | p95 | Notes |
| --- | --- | --- | --- |
| `Tick - Real setTick (50 handlers)` | `93.12K ops/sec` | `0.021ms` | good light-handler budget |
| `Tick - 5 Handlers (medium workload)` | `18.45K ops/sec` | `0.098ms` | still acceptable under moderate work |
| `Tick - 5 Handlers (heavy workload)` | `2.26K ops/sec` | `0.559ms` | heavy work is the danger zone |
| `Tick - Parallel Execution` | `243.24 ops/sec` | `8.00ms` | expensive and not a default win |

Takeaway:

- small tick handlers are cheap
- heavy per-tick work remains one of the biggest practical risks for servers
- parallel tick execution is far more expensive than sequential in this run

### BinaryService

| Scenario | Throughput | p95 | Notes |
| --- | --- | --- | --- |
| `BinaryService - Parse mixed responses (500 ops)` | `1.20M ops/sec` | `0.0011ms` | very strong parse path |
| `BinaryService - Full round-trip (50 calls)` | `350.12K ops/sec` | `0.0092ms` | healthy round-trip path |
| `BinaryService - Serialize large payload (500 ops)` | `2.88K ops/sec` | `0.428ms` | large payload serialization is expensive |

Takeaway:

- binary transport is excellent for parse and smaller payloads
- large payload serialization is the main bottleneck here

## Startup Suite

### MetadataScanner

| Scenario | Throughput | Median | p99 |
| --- | --- | --- | --- |
| `1 controller, 3 methods` | `743.86K ops/sec` | `1.27μs` | `4.49μs` |
| `3 controllers, 6 methods` | `390.84K ops/sec` | `2.48μs` | `4.61μs` |
| `10 controllers` | `112.61K ops/sec` | `8.73μs` | `21.15μs` |

### Dependency Injection

| Scenario | Throughput | Median | p99 |
| --- | --- | --- | --- |
| `Resolve simple service` | `1.92M ops/sec` | `0.48μs` | `1.36μs` |
| `Resolve 100 times (simple)` | `69.44K ops/sec` | `14.06μs` | `32.24μs` |

### SchemaGenerator

| Scenario | Throughput | Median | p99 |
| --- | --- | --- | --- |
| `1 param` | `42.58K ops/sec` | `22.33μs` | `71.08μs` |
| `3 params` | `28.79K ops/sec` | `33.19μs` | `98.64μs` |
| `5 params` | `17.29K ops/sec` | `55.17μs` | `142.94μs` |
| `batch 10 methods` | `3.18K ops/sec` | `0.298ms` | `11.48ms` |
| `batch 50 methods` | `628 ops/sec` | `1.45ms` | `14.17ms` |

### Bootstrap Load

| Scenario | Throughput | p95 |
| --- | --- | --- |
| `Bootstrap - 1 controller` | `2.81K ops/sec` | `1.11ms` |
| `Bootstrap - 10 controllers` | `1.16K ops/sec` | `1.46ms` |
| `Bootstrap - 50 controllers` | `396.99 ops/sec` | `2.84ms` |
| `Bootstrap - 100 controllers` | `205.87 ops/sec` | `6.37ms` |

Takeaway:

- startup remains healthy
- schema generation is the most expensive startup subsystem visible in this run

## Diagnostic Suite

The diagnostic suite still has value for framework maintainers, especially for:

- Zod validation cost
- rate limiter scaling
- event bus fan-out cost
- decorator and metadata overhead

Notable diagnostics:

- `Zod - Simple schema validation`: `2.72M ops/sec`
- `RateLimiter - Single key check`: `3.50M ops/sec`
- `EventBus - Emit to 1 handler`: `4.56M ops/sec`
- `EventBus - Emit to 100 handlers`: `131.12K ops/sec`

However, this suite still contains scenarios with zero iterations and should not be treated as the primary external benchmark story.

## Engineering Conclusions

## What these numbers say about the framework

1. OpenCore hot paths are fast when kept on the intended model.
2. Validation and typed dispatch are not the dominant cost in most happy paths.
3. Concurrency pressure is more important than raw single-path throughput.
4. Tick workload and large payload serialization are the practical danger areas.
5. Startup cost is acceptable and mostly dominated by schema generation scale.

## What matters most to server developers

For real servers, the most useful numbers in this report are:

- command concurrent throughput and tail latency
- net event cost by payload size
- tick budget under realistic handler counts
- lifecycle churn under hundreds of players
- bootstrap time as controller count grows

## Recommended Follow-up

1. Fix or remove zero-iteration diagnostic benchmarks.
2. Increase sample counts for low-op scenarios like pending-request lifecycle and buffer split benchmarks.
3. Add memory and event-loop lag metrics to `gold` and `soak`.
4. Keep `gold` as the default benchmark story for docs and landing pages.

## Final Verdict

This benchmark run supports the new benchmark direction.

OpenCore now has a benchmark system that is useful for:

- framework engineering
- release validation
- communicating real runtime behavior

The benchmark story is no longer “here are some fast internals”.

It is now closer to:

- here is what commands cost
- here is what net events cost
- here is what ticks cost
- here is how lifecycle behaves at scale
- here is what startup actually costs
