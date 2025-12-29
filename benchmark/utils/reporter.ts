import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { BenchmarkMetrics, LoadTestMetrics } from './metrics'
import { formatOpsPerSec, formatTime } from './metrics'

export interface BenchmarkReport {
  timestamp: string
  version: string
  core: BenchmarkMetrics[]
  load: LoadTestMetrics[]
}

const REPORTS_DIR = join(process.cwd(), 'benchmark', 'reports')

function ensureReportsDir(): void {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true })
  }
}

export function generateTextReport(report: BenchmarkReport): string {
  let output = '\n'
  output += '═'.repeat(80) + '\n'
  output += '  OpenCore Framework - Benchmark Report\n'
  output += '═'.repeat(80) + '\n'
  output += `Timestamp: ${report.timestamp}\n`
  output += `Version: ${report.version}\n`
  output += '\n'

  if (report.core.length > 0) {
    output += '─'.repeat(80) + '\n'
    output += '  CORE BENCHMARKS (Tinybench)\n'
    output += '─'.repeat(80) + '\n\n'

    for (const metric of report.core) {
      output += `  ${metric.name}\n`
      output += `    Iterations: ${metric.iterations}\n`
      output += `    Mean:       ${formatTime(metric.mean)} (${formatOpsPerSec(metric.opsPerSec)})\n`
      output += `    Min:        ${formatTime(metric.min)}\n`
      output += `    Max:        ${formatTime(metric.max)}\n`
      output += `    Median:     ${formatTime(metric.median)}\n`
      output += `    p95:        ${formatTime(metric.p95)}\n`
      output += `    p99:        ${formatTime(metric.p99)}\n`
      output += `    Std Dev:    ${formatTime(metric.stdDev)}\n`
      output += '\n'
    }
  }

  if (report.load.length > 0) {
    output += '─'.repeat(80) + '\n'
    output += '  LOAD BENCHMARKS (Vitest)\n'
    output += '─'.repeat(80) + '\n\n'

    for (const metric of report.load) {
      output += `  ${metric.name} (${metric.playerCount} players)\n`
      output += `    Operations:  ${metric.totalOperations} (${metric.successCount} success, ${metric.errorCount} errors)\n`
      output += `    Error Rate:  ${(metric.errorRate * 100).toFixed(2)}%\n`
      output += `    Mean:        ${formatTime(metric.mean)}\n`
      output += `    Min:         ${formatTime(metric.min)}\n`
      output += `    Max:         ${formatTime(metric.max)}\n`
      output += `    p50:         ${formatTime(metric.p50)}\n`
      output += `    p95:         ${formatTime(metric.p95)}\n`
      output += `    p99:         ${formatTime(metric.p99)}\n`
      output += `    Throughput:  ${formatOpsPerSec(metric.throughput)}\n`
      output += '\n'
    }
  }

  output += '═'.repeat(80) + '\n'
  return output
}

export function generateJSONReport(report: BenchmarkReport): string {
  return JSON.stringify(report, null, 2)
}

export function generateHTMLReport(report: BenchmarkReport): string {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenCore Framework - Benchmark Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    h1 { color: white; font-size: 2em; margin-bottom: 10px; }
    .meta { color: rgba(255,255,255,0.9); font-size: 0.9em; }
    section { margin-bottom: 40px; }
    h2 {
      color: #4ec9b0;
      border-bottom: 2px solid #4ec9b0;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #252526;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    th {
      background: #2d2d30;
      color: #4ec9b0;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 12px;
      border-top: 1px solid #3e3e42;
    }
    tr:hover { background: #2d2d30; }
    .metric-value { color: #ce9178; font-weight: 500; }
    .metric-label { color: #858585; }
    .success { color: #4ec9b0; }
    .error { color: #f48771; }
    .chart-container {
      background: #252526;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .bar {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      height: 30px;
      border-radius: 4px;
      margin: 5px 0;
      display: flex;
      align-items: center;
      padding: 0 10px;
      color: white;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>OpenCore Framework - Benchmark Report</h1>
      <div class="meta">
        <p><strong>Timestamp:</strong> ${report.timestamp}</p>
        <p><strong>Version:</strong> ${report.version}</p>
      </div>
    </header>

    ${report.core.length > 0 ? generateCoreSection(report.core) : ''}
    ${report.load.length > 0 ? generateLoadSection(report.load) : ''}
  </div>
</body>
</html>`

  return html
}

function generateCoreSection(metrics: BenchmarkMetrics[]): string {
  let html = `
    <section>
      <h2>Core Benchmarks</h2>
      <table>
        <thead>
          <tr>
            <th>Benchmark</th>
            <th>Iterations</th>
            <th>Mean</th>
            <th>Min</th>
            <th>Max</th>
            <th>p95</th>
            <th>p99</th>
            <th>Ops/sec</th>
          </tr>
        </thead>
        <tbody>
  `

  for (const metric of metrics) {
    html += `
          <tr>
            <td><strong>${metric.name}</strong></td>
            <td>${metric.iterations}</td>
            <td class="metric-value">${formatTime(metric.mean)}</td>
            <td class="metric-value">${formatTime(metric.min)}</td>
            <td class="metric-value">${formatTime(metric.max)}</td>
            <td class="metric-value">${formatTime(metric.p95)}</td>
            <td class="metric-value">${formatTime(metric.p99)}</td>
            <td class="metric-value">${formatOpsPerSec(metric.opsPerSec)}</td>
          </tr>
    `
  }

  html += `
        </tbody>
      </table>
    </section>
  `

  return html
}

function generateLoadSection(metrics: LoadTestMetrics[]): string {
  let html = `
    <section>
      <h2>Load Benchmarks</h2>
      <table>
        <thead>
          <tr>
            <th>Benchmark</th>
            <th>Players</th>
            <th>Operations</th>
            <th>Success</th>
            <th>Errors</th>
            <th>Error Rate</th>
            <th>Mean</th>
            <th>p95</th>
            <th>p99</th>
            <th>Throughput</th>
          </tr>
        </thead>
        <tbody>
  `

  for (const metric of metrics) {
    html += `
          <tr>
            <td><strong>${metric.name}</strong></td>
            <td>${metric.playerCount}</td>
            <td>${metric.totalOperations}</td>
            <td class="success">${metric.successCount}</td>
            <td class="error">${metric.errorCount}</td>
            <td class="${metric.errorRate > 0.05 ? 'error' : 'success'}">${(metric.errorRate * 100).toFixed(2)}%</td>
            <td class="metric-value">${formatTime(metric.mean)}</td>
            <td class="metric-value">${formatTime(metric.p95)}</td>
            <td class="metric-value">${formatTime(metric.p99)}</td>
            <td class="metric-value">${formatOpsPerSec(metric.throughput)}</td>
          </tr>
    `
  }

  html += `
        </tbody>
      </table>
    </section>
  `

  return html
}

export function saveReport(
  report: BenchmarkReport,
  format: 'text' | 'json' | 'html' = 'text',
): string {
  ensureReportsDir()

  let content: string
  let extension: string

  switch (format) {
    case 'json':
      content = generateJSONReport(report)
      extension = 'json'
      break
    case 'html':
      content = generateHTMLReport(report)
      extension = 'html'
      break
    default:
      content = generateTextReport(report)
      extension = 'txt'
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `benchmark-${timestamp}.${extension}`
  const filepath = join(REPORTS_DIR, filename)

  writeFileSync(filepath, content, 'utf-8')
  return filepath
}

export function printReport(report: BenchmarkReport): void {
  console.log(generateTextReport(report))
}
