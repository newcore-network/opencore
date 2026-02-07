#!/usr/bin/env node
import 'reflect-metadata'

import { spawn } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'
import { runAccessControlBenchmark } from './core/access-control.bench'
import { runDecoratorsBenchmark } from './core/decorators.bench'
import { runDependencyInjectionBenchmark } from './core/dependency-injection.bench'
import { runEventBusBenchmark } from './core/event-bus.bench'
import { runMetadataScannerBenchmark } from './core/metadata-scanner.bench'
import { runParallelComputeBenchmark } from './core/parallel-compute.bench'
import { runRateLimiterBenchmark } from './core/rate-limiter.bench'
import { runValidationBenchmark } from './core/validation.bench'
import { runBinaryServiceBenchmark } from './core/binary-service.bench'
import { runSchemaGeneratorBenchmark } from './core/schema-generator.bench'
import { runEntitySystemBenchmark } from './core/entity-system.bench'
import { runAppearanceValidationBenchmark } from './core/appearance-validation.bench'
import { runEventInterceptorBenchmark } from './core/event-interceptor.bench'
import { runRuntimeConfigBenchmark } from './core/runtime-config.bench'
import { clearCollectedMetrics, readCollectedMetrics } from './utils/load-collector'
import type { BenchmarkMetrics, LoadTestMetrics } from './utils/metrics'
import { printReport, saveReport } from './utils/reporter'

function percentileHelper(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]

  const index = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index - lower

  if (upper >= sorted.length) return sorted[sorted.length - 1]
  if (lower === upper) return sorted[lower]

  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

function convertTinybenchResult(result: any): BenchmarkMetrics {
  const samples = result.samples || []
  const sorted = [...samples].sort((a: number, b: number) => a - b)

  return {
    name: result.name || 'unknown',
    iterations: samples.length,
    mean: result.mean || 0,
    min: result.min || 0,
    max: result.max || 0,
    median: percentileHelper(sorted, 50),
    p95: percentileHelper(sorted, 95),
    p99: percentileHelper(sorted, 99),
    stdDev: result.sd || 0,
    opsPerSec: result.mean ? 1000 / result.mean : 0,
    totalTime: result.totalTime || 0,
  }
}

const args = process.argv.slice(2)
const runCore = args.includes('--core') || args.includes('--all')
const runLoad = args.includes('--load') || args.includes('--all')
const runAll = args.includes('--all')

if (!runCore && !runLoad && !runAll) {
  console.log('Usage:')
  console.log('  --core    Run core benchmarks (Tinybench)')
  console.log('  --load    Run load benchmarks (Vitest)')
  console.log('  --all     Run all benchmarks')
  process.exit(0)
}

async function runCoreBenchmarks(): Promise<BenchmarkMetrics[]> {
  console.log('\n🔬 Running Core Benchmarks (Tinybench)...\n')

  const results: BenchmarkMetrics[] = []

  // Metadata Scanner
  console.log('Running MetadataScanner benchmark...')
  const scannerBench = await runMetadataScannerBenchmark()
  await scannerBench.warmup()
  await scannerBench.run()
  for (const task of scannerBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // Dependency Injection
  console.log('Running DependencyInjection benchmark...')
  const diBench = await runDependencyInjectionBenchmark()
  await diBench.warmup()
  await diBench.run()
  for (const task of diBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // Validation
  console.log('Running Validation benchmark...')
  const validationBench = await runValidationBenchmark()
  await validationBench.warmup()
  await validationBench.run()
  for (const task of validationBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // Rate Limiter
  console.log('Running RateLimiter benchmark...')
  const rateLimiterBench = await runRateLimiterBenchmark()
  await rateLimiterBench.warmup()
  await rateLimiterBench.run()
  for (const task of rateLimiterBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  console.log('Running AccessControl benchmark...')
  const accessControlBench = await runAccessControlBenchmark()
  await accessControlBench.warmup()
  await accessControlBench.run()
  for (const task of accessControlBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // Event Bus
  console.log('Running EventBus benchmark...')
  const eventBusBench = await runEventBusBenchmark()
  await eventBusBench.warmup()
  await eventBusBench.run()
  for (const task of eventBusBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // Decorators
  console.log('Running Decorators benchmark...')
  const decoratorsBench = await runDecoratorsBenchmark()
  await decoratorsBench.warmup()
  await decoratorsBench.run()
  for (const task of decoratorsBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // ParallelCompute
  console.log('Running ParallelCompute benchmark...')
  const parallelBench = await runParallelComputeBenchmark()
  await parallelBench.warmup()
  await parallelBench.run()
  for (const task of parallelBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // BinaryService
  console.log('Running BinaryService benchmark...')
  const binaryBench = await runBinaryServiceBenchmark()
  await binaryBench.warmup()
  await binaryBench.run()
  for (const task of binaryBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // SchemaGenerator
  console.log('Running SchemaGenerator benchmark...')
  const schemaBench = await runSchemaGeneratorBenchmark()
  await schemaBench.warmup()
  await schemaBench.run()
  for (const task of schemaBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // EntitySystem
  console.log('Running EntitySystem benchmark...')
  const entityBench = await runEntitySystemBenchmark()
  await entityBench.warmup()
  await entityBench.run()
  for (const task of entityBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // AppearanceValidation
  console.log('Running AppearanceValidation benchmark...')
  const appearanceBench = await runAppearanceValidationBenchmark()
  await appearanceBench.warmup()
  await appearanceBench.run()
  for (const task of appearanceBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // EventInterceptor
  console.log('Running EventInterceptor benchmark...')
  const interceptorBench = await runEventInterceptorBenchmark()
  await interceptorBench.warmup()
  await interceptorBench.run()
  for (const task of interceptorBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  // RuntimeConfig
  console.log('Running RuntimeConfig benchmark...')
  const runtimeBench = await runRuntimeConfigBenchmark()
  await runtimeBench.warmup()
  await runtimeBench.run()
  for (const task of runtimeBench.tasks) {
    if (task.result) {
      results.push(convertTinybenchResult({ ...task.result, name: task.name }))
    }
  }

  return results
}

async function runLoadBenchmarks(): Promise<LoadTestMetrics[]> {
  console.log('\n⚡ Running Load Benchmarks (Vitest)...\n')

  clearCollectedMetrics()

  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32'
    const npmCmd = isWindows ? 'npx.cmd' : 'npx'

    const vitest = spawn(npmCmd, ['vitest', 'run', '--project', 'benchmark', 'benchmark/load'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: isWindows,
      cwd: process.cwd(),
    })

    let output = ''
    let errorOutput = ''

    vitest.stdout?.on('data', (data) => {
      const text = data.toString()
      output += text
      process.stdout.write(text)
    })

    vitest.stderr?.on('data', (data) => {
      const text = data.toString()
      errorOutput += text
      if (!text.includes('[CORE]')) {
        process.stderr.write(text)
      }
    })

    vitest.on('close', (code) => {
      if (code !== 0) {
        console.warn(`\n⚠️  Vitest exited with code ${code}`)
      }

      const metrics = readCollectedMetrics()
      console.log(`\n📊 Collected ${metrics.length} load test metrics\n`)
      resolve(metrics)
    })

    vitest.on('error', (err) => {
      console.error('Error spawning vitest:', err)
      resolve([])
    })
  })
}

async function main() {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
  const version = packageJson.version || 'unknown'

  const report = {
    timestamp: new Date().toISOString(),
    version,
    core: [] as BenchmarkMetrics[],
    load: [] as LoadTestMetrics[],
  }

  if (runCore || runAll) {
    report.core = await runCoreBenchmarks()
  }

  if (runLoad || runAll) {
    report.load = await runLoadBenchmarks()
  }

  printReport(report)
  saveReport(report, 'text')
  saveReport(report, 'json')
  saveReport(report, 'html')

  console.log('\n✅ Benchmarks completed!')
  console.log('📊 Reports saved to benchmark/reports/\n')
}

main().catch((error) => {
  console.error('Error running benchmarks:', error)
  process.exit(1)
})
