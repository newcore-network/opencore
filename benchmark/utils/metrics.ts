export interface BenchmarkMetrics {
  name: string
  iterations: number
  mean: number
  min: number
  max: number
  median: number
  p95: number
  p99: number
  stdDev: number
  opsPerSec: number
  totalTime: number
}

export interface LoadTestMetrics {
  name: string
  playerCount: number
  totalOperations: number
  successCount: number
  errorCount: number
  timings: number[]
  mean: number
  min: number
  max: number
  p50: number
  p95: number
  p99: number
  throughput: number
  errorRate: number
}

export function calculateMetrics(timings: number[], name: string): BenchmarkMetrics {
  if (timings.length === 0) {
    throw new Error('Timings array cannot be empty')
  }

  const sorted = [...timings].sort((a, b) => a - b)
  const sum = sorted.reduce((acc, val) => acc + val, 0)
  const mean = sum / sorted.length
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const median = percentile(sorted, 50)
  const p95 = percentile(sorted, 95)
  const p99 = percentile(sorted, 99)

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length
  const stdDev = Math.sqrt(variance)
  const opsPerSec = 1000 / mean

  return {
    name,
    iterations: timings.length,
    mean,
    min,
    max,
    median,
    p95,
    p99,
    stdDev,
    opsPerSec,
    totalTime: sum,
  }
}

export function calculateLoadMetrics(
  timings: number[],
  name: string,
  playerCount: number,
  successCount: number,
  errorCount: number,
): LoadTestMetrics {
  if (timings.length === 0) {
    return {
      name,
      playerCount,
      totalOperations: successCount + errorCount,
      successCount,
      errorCount,
      timings: [],
      mean: 0,
      min: 0,
      max: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      throughput: 0,
      errorRate: errorCount / (successCount + errorCount) || 0,
    }
  }

  const sorted = [...timings].sort((a, b) => a - b)
  const sum = sorted.reduce((acc, val) => acc + val, 0)
  const mean = sum / sorted.length
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const p50 = percentile(sorted, 50)
  const p95 = percentile(sorted, 95)
  const p99 = percentile(sorted, 99)

  const totalTime = Math.max(...timings)
  const throughput = (successCount / totalTime) * 1000

  return {
    name,
    playerCount,
    totalOperations: successCount + errorCount,
    successCount,
    errorCount,
    timings: sorted,
    mean,
    min,
    max,
    p50,
    p95,
    p99,
    throughput,
    errorRate: errorCount / (successCount + errorCount) || 0,
  }
}

function percentile(sorted: number[], p: number): number {
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

export function formatTime(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`
  if (ms < 1000) return `${ms.toFixed(2)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function formatOpsPerSec(ops: number): string {
  if (ops >= 1000000) return `${(ops / 1000000).toFixed(2)}M ops/sec`
  if (ops >= 1000) return `${(ops / 1000).toFixed(2)}K ops/sec`
  return `${ops.toFixed(2)} ops/sec`
}

export function compareMetrics(
  baseline: BenchmarkMetrics,
  current: BenchmarkMetrics,
): {
  meanDiff: number
  opsDiff: number
  faster: boolean
} {
  const meanDiff = ((current.mean - baseline.mean) / baseline.mean) * 100
  const opsDiff = ((current.opsPerSec - baseline.opsPerSec) / baseline.opsPerSec) * 100
  const faster = current.mean < baseline.mean

  return {
    meanDiff,
    opsDiff,
    faster,
  }
}

// Re-exportar el collector para uso en tests
import { collectLoadMetric } from './load-collector'
export { collectLoadMetric }

/**
 * Reporta una métrica de load test (imprime a consola Y recopila para el reporte)
 */
export function reportLoadMetric(metrics: LoadTestMetrics): void {
  // Imprimir a consola
  console.log(
    `[LOAD] ${metrics.name}: ${metrics.throughput.toFixed(2)} ops/sec, p95: ${metrics.p95.toFixed(2)}ms`,
  )

  // Recopilar para el reporte
  collectLoadMetric(metrics)
}
