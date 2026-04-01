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
  const latency = result.latency
  const throughput = result.throughput
  const samples = latency?.samples || []

  if (!latency || !throughput) {
    return {
      name: result.name || 'unknown',
      suite: 'diagnostic',
      iterations: 0,
      mean: 0,
      min: 0,
      max: 0,
      median: 0,
      p75: 0,
      p99: 0,
      stdDev: 0,
      opsPerSec: 0,
      totalTime: result.totalTime || 0,
    }
  }

  return {
    name: result.name || 'unknown',
    suite: 'diagnostic',
    iterations: latency.samplesCount || 0,
    mean: latency.mean || 0,
    min: latency.min || 0,
    max: latency.max || 0,
    median: latency.p50 || percentileHelper(samples, 50),
    p75: latency.p75 || percentileHelper(samples, 75),
    p99: latency.p99 || percentileHelper(samples, 99),
    stdDev: latency.sd || 0,
    opsPerSec: throughput.mean || 0,
    totalTime: result.totalTime || 0,
  }
}

const args = process.argv.slice(2)
const runAll = args.includes('--all')
const runValue = args.includes('--value')
const runStartup = args.includes('--startup')
const runDiagnostic = args.includes('--diagnostic')
const runLegacyCore = args.includes('--core')
const runLegacyLoad = args.includes('--load')

const shouldRunStartupCore = runAll || runValue || runStartup
const shouldRunDiagnosticCore = runAll || runDiagnostic || runLegacyCore
const loadProjects = [
  ...(runAll || runValue || runLegacyLoad
    ? [{ project: 'benchmark-gold', suite: 'gold' as const }]
    : []),
  ...(runAll || runValue || runStartup
    ? [{ project: 'benchmark-startup', suite: 'startup' as const }]
    : []),
  ...(runAll || runDiagnostic
    ? [{ project: 'benchmark-diagnostic', suite: 'diagnostic' as const }]
    : []),
  ...(runAll ? [{ project: 'benchmark-soak', suite: 'soak' as const }] : []),
]

if (!runValue && !runStartup && !runDiagnostic && !runLegacyCore && !runLegacyLoad && !runAll) {
  console.log('Usage:')
  console.log('  --value        Run value-focused framework benchmarks')
  console.log('  --startup      Run startup/bootstrap benchmarks')
  console.log('  --diagnostic   Run low-level diagnostic benchmarks')
  console.log('  --load         Run gold + startup load benchmarks')
  console.log('  --core         Run diagnostic core benchmarks')
  console.log('  --all          Run all benchmark suites')
  process.exit(0)
}

async function runCoreBenchmarks(
  suite: 'startup' | 'diagnostic',
): Promise<BenchmarkMetrics[]> {
  console.log(`\n🔬 Running ${suite === 'startup' ? 'Startup' : 'Diagnostic'} Core Benchmarks (Tinybench)...\n`)

  const results: BenchmarkMetrics[] = []

  const collectResults = async (label: string, createBench: () => Promise<any>) => {
    console.log(`Running ${label} benchmark...`)
    const bench = await createBench()
    await bench.run()

    for (const task of bench.tasks) {
      if (task.result) {
        results.push({ ...convertTinybenchResult({ ...task.result, name: task.name }), suite })
      }
    }
  }

  if (suite === 'startup') {
    await collectResults('MetadataScanner', runMetadataScannerBenchmark)
    await collectResults('DependencyInjection', runDependencyInjectionBenchmark)
    await collectResults('SchemaGenerator', runSchemaGeneratorBenchmark)
    return results
  }

  await collectResults('Validation', runValidationBenchmark)
  await collectResults('RateLimiter', runRateLimiterBenchmark)
  await collectResults('AccessControl', runAccessControlBenchmark)
  await collectResults('EventBus', runEventBusBenchmark)
  await collectResults('Decorators', runDecoratorsBenchmark)
  await collectResults('ParallelCompute', runParallelComputeBenchmark)
  await collectResults('BinaryService', runBinaryServiceBenchmark)
  await collectResults('EntitySystem', runEntitySystemBenchmark)
  await collectResults('AppearanceValidation', runAppearanceValidationBenchmark)
  await collectResults('EventInterceptor', runEventInterceptorBenchmark)
  await collectResults('RuntimeConfig', runRuntimeConfigBenchmark)

  return results
}

async function runLoadBenchmarks(
  projects: Array<{ project: string; suite: 'gold' | 'startup' | 'diagnostic' | 'soak' }>,
): Promise<LoadTestMetrics[]> {
  console.log(`\n⚡ Running Load Benchmarks (${projects.map((entry) => entry.project).join(', ')})...\n`)

  clearCollectedMetrics()

  const runProject = (entry: { project: string; suite: 'gold' | 'startup' | 'diagnostic' | 'soak' }) =>
    new Promise<void>((resolve, reject) => {
    const isWindows = process.platform === 'win32'
    const npmCmd = isWindows ? 'npx.cmd' : 'npx'

    const vitest = spawn(npmCmd, ['vitest', 'run', '--project', entry.project], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: isWindows,
      cwd: process.cwd(),
      env: {
        ...process.env,
        BENCHMARK_SUITE: entry.suite,
      },
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
      resolve()
    })

    vitest.on('error', (err) => {
      reject(err)
    })
  })

  for (const entry of projects) {
    await runProject(entry)
  }

  const metrics = readCollectedMetrics()
  console.log(`\n📊 Collected ${metrics.length} load test metrics\n`)
  return metrics
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

  if (shouldRunStartupCore) {
    report.core.push(...(await runCoreBenchmarks('startup')))
  }

  if (shouldRunDiagnosticCore) {
    report.core.push(...(await runCoreBenchmarks('diagnostic')))
  }

  if (loadProjects.length > 0) {
    report.load = await runLoadBenchmarks(loadProjects)
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
