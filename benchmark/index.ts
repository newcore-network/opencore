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

  const collectResults = async (label: string, createBench: () => Promise<any>) => {
    console.log(`Running ${label} benchmark...`)
    const bench = await createBench()
    await bench.run()

    for (const task of bench.tasks) {
      if (task.result) {
        results.push(convertTinybenchResult({ ...task.result, name: task.name }))
      }
    }
  }

  await collectResults('MetadataScanner', runMetadataScannerBenchmark)
  await collectResults('DependencyInjection', runDependencyInjectionBenchmark)
  await collectResults('Validation', runValidationBenchmark)
  await collectResults('RateLimiter', runRateLimiterBenchmark)
  await collectResults('AccessControl', runAccessControlBenchmark)
  await collectResults('EventBus', runEventBusBenchmark)
  await collectResults('Decorators', runDecoratorsBenchmark)
  await collectResults('ParallelCompute', runParallelComputeBenchmark)
  await collectResults('BinaryService', runBinaryServiceBenchmark)
  await collectResults('SchemaGenerator', runSchemaGeneratorBenchmark)
  await collectResults('EntitySystem', runEntitySystemBenchmark)
  await collectResults('AppearanceValidation', runAppearanceValidationBenchmark)
  await collectResults('EventInterceptor', runEventInterceptorBenchmark)
  await collectResults('RuntimeConfig', runRuntimeConfigBenchmark)

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
        reject(new Error(`Vitest benchmark project exited with code ${code}`))
        return
      }

      const metrics = readCollectedMetrics()
      console.log(`\n📊 Collected ${metrics.length} load test metrics\n`)
      resolve(metrics)
    })

    vitest.on('error', (err) => {
      reject(err)
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
