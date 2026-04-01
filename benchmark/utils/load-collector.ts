import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs'
import { dirname, join } from 'path'
import type { LoadTestMetrics } from './metrics'

const METRICS_FILE = join(process.cwd(), 'benchmark', 'reports', '.load-metrics.json')

interface CollectedMetric {
  name: string
  suite: 'gold' | 'startup' | 'diagnostic' | 'soak'
  playerCount: number
  durationMs: number
  throughput: number
  successThroughput: number
  p95: number
  mean: number
  min: number
  max: number
  p50: number
  p99: number
  successCount: number
  errorCount: number
  errorRate: number
  timestamp: number
}

export function collectLoadMetric(metrics: LoadTestMetrics): void {
  mkdirSync(dirname(METRICS_FILE), { recursive: true })

  const collected: CollectedMetric = {
    name: metrics.name,
    suite: metrics.suite,
    playerCount: metrics.playerCount,
    durationMs: metrics.durationMs,
    throughput: metrics.throughput,
    successThroughput: metrics.successThroughput,
    p95: metrics.p95,
    mean: metrics.mean,
    min: metrics.min,
    max: metrics.max,
    p50: metrics.p50,
    p99: metrics.p99,
    successCount: metrics.successCount,
    errorCount: metrics.errorCount,
    errorRate: metrics.errorRate,
    timestamp: Date.now(),
  }

  appendFileSync(METRICS_FILE, `${JSON.stringify(collected)}\n`, 'utf-8')
}

export function readCollectedMetrics(): LoadTestMetrics[] {
  if (!existsSync(METRICS_FILE)) {
    return []
  }

  try {
    const collected = readFileSync(METRICS_FILE, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as CollectedMetric)

    return collected.map((c) => ({
      name: c.name,
      suite: c.suite,
      playerCount: c.playerCount,
      totalOperations: c.successCount + c.errorCount,
      successCount: c.successCount,
      errorCount: c.errorCount,
      timings: [],
      durationMs: c.durationMs,
      mean: c.mean,
      min: c.min,
      max: c.max,
      p50: c.p50,
      p95: c.p95,
      p99: c.p99,
      throughput: c.throughput,
      successThroughput: c.successThroughput,
      errorRate: c.errorRate,
    }))
  } catch {
    return []
  }
}

export function clearCollectedMetrics(): void {
  mkdirSync(dirname(METRICS_FILE), { recursive: true })
  if (existsSync(METRICS_FILE)) {
    unlinkSync(METRICS_FILE)
  }
}

export function getMetricsFilePath(): string {
  return METRICS_FILE
}
