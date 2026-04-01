# Benchmark System – OpenCore Framework

The benchmark suite is organized around framework value, not around measuring every internal helper.

## Benchmark Tiers

### Gold

These are the main framework feature benchmarks and should be the default path for local checks and regression tracking.

- full command execution
- full net event handling
- RPC processing
- player lifecycle churn
- tick budget impact
- binary transport cost

### Startup

These measure initialization and registration cost.

- bootstrap controller scanning
- metadata scanning
- dependency injection setup
- schema generation

### Diagnostic

These are synthetic or low-level internals. They are useful for profiling, but they should not dominate the primary report.

- validation internals
- rate limiter internals
- access control internals
- event bus internals
- decorators
- entity-system internals
- runtime config
- event interceptor

### Soak

Longer-running stress scenarios intended for nightly or release validation.

## Usage

```bash
pnpm bench
pnpm bench:value
pnpm bench:gold
pnpm bench:startup
pnpm bench:diagnostic
pnpm bench:soak
pnpm bench:load
pnpm bench:all
```

## What The Default Suite Optimizes For

The default suite tries to answer questions that matter to server developers:

1. What is the cost of the real command pipeline?
2. What is the cost of validated net event handling?
3. How does RPC behave under realistic concurrency?
4. What player churn can the runtime absorb?
5. What tick budget is consumed as handlers grow?
6. What does startup cost look like as controllers increase?

## Reports

Reports are generated under `benchmark/reports/`.

- `.txt`: human-readable summary
- `.json`: machine-readable output
- `.html`: interactive report

Load benchmark runs also append metrics to `benchmark/reports/.load-metrics.json` as a local artifact.

## Latest Run Report

For a full diagnosis and interpretation of the latest benchmark pass, see `benchmark/LATEST_REPORT.md`.

## Notes

- Compare runs relatively, not absolutely.
- `bench` intentionally focuses on high-value framework features.
- `bench:diagnostic` is where low-level synthetic benchmarks live.
- `bench:all` remains available when full coverage is needed.
