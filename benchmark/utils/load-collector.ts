import { writeFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import type { LoadTestMetrics } from './metrics'

const METRICS_FILE = join(process.cwd(), 'benchmark', 'reports', '.load-metrics.json')

interface CollectedMetric {
  name: string
  playerCount: number
  throughput: number
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
  // Ensure reports directory exists (Vitest runs may start from a clean workspace)
  mkdirSync(dirname(METRICS_FILE), { recursive: true })

  const collected: CollectedMetric = {
    name: metrics.name,
    playerCount: metrics.playerCount,
    throughput: metrics.throughput,
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

  let existingMetrics: CollectedMetric[] = []

  if (existsSync(METRICS_FILE)) {
    try {
      existingMetrics = JSON.parse(readFileSync(METRICS_FILE, 'utf-8'))
    } catch {
      existingMetrics = []
    }
  } else {
    // Initialize file to avoid ENOENT when writing under certain runners
    writeFileSync(METRICS_FILE, '[]')
  }

  existingMetrics.push(collected)
  writeFileSync(METRICS_FILE, JSON.stringify(existingMetrics, null, 2))
}

export function readCollectedMetrics(): LoadTestMetrics[] {
  if (!existsSync(METRICS_FILE)) {
    return []
  }

  try {
    const collected: CollectedMetric[] = JSON.parse(readFileSync(METRICS_FILE, 'utf-8'))

    return collected.map((c) => ({
      name: c.name,
      playerCount: c.playerCount,
      totalOperations: c.successCount + c.errorCount,
      successCount: c.successCount,
      errorCount: c.errorCount,
      timings: [],
      mean: c.mean,
      min: c.min,
      max: c.max,
      p50: c.p50,
      p95: c.p95,
      p99: c.p99,
      throughput: c.throughput,
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
