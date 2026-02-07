import { Bench } from 'tinybench'
import {
  resolveRuntimeOptions,
  validateRuntimeOptions,
  type ServerInitOptions,
} from '../../src/runtime/server/runtime'

/**
 * Benchmarks for runtime configuration resolution and validation.
 * Measures the cost of resolveRuntimeOptions and validateRuntimeOptions
 * across different framework modes.
 */
export async function runRuntimeConfigBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  // ── resolveRuntimeOptions ────────────────────────────────────────

  bench.add('RuntimeConfig - resolve CORE mode', () => {
    resolveRuntimeOptions({ mode: 'CORE' })
  })

  bench.add('RuntimeConfig - resolve STANDALONE mode', () => {
    resolveRuntimeOptions({ mode: 'STANDALONE' })
  })

  bench.add('RuntimeConfig - resolve RESOURCE mode', () => {
    resolveRuntimeOptions({ mode: 'RESOURCE', coreResourceName: 'core' })
  })

  bench.add('RuntimeConfig - resolve with disabled features', () => {
    resolveRuntimeOptions({
      mode: 'STANDALONE',
      features: { disabled: ['chat', 'principal'] },
    })
  })

  // ── validateRuntimeOptions (happy path) ──────────────────────────

  const coreOptions = resolveRuntimeOptions({ mode: 'CORE' })
  const standaloneOptions = resolveRuntimeOptions({ mode: 'STANDALONE' })
  const standaloneDisabled = resolveRuntimeOptions({
    mode: 'STANDALONE',
    features: { disabled: ['chat', 'principal', 'fiveMEvents'] },
  })

  bench.add('RuntimeConfig - validate CORE (happy path)', () => {
    validateRuntimeOptions(coreOptions)
  })

  bench.add('RuntimeConfig - validate STANDALONE (happy path)', () => {
    validateRuntimeOptions(standaloneOptions)
  })

  bench.add('RuntimeConfig - validate STANDALONE with disabled features', () => {
    validateRuntimeOptions(standaloneDisabled)
  })

  // ── Full resolve + validate cycle ────────────────────────────────

  bench.add('RuntimeConfig - full cycle CORE (resolve + validate)', () => {
    const opts = resolveRuntimeOptions({ mode: 'CORE' })
    validateRuntimeOptions(opts)
  })

  bench.add('RuntimeConfig - full cycle STANDALONE (resolve + validate)', () => {
    const opts = resolveRuntimeOptions({ mode: 'STANDALONE' })
    validateRuntimeOptions(opts)
  })

  // ── Batch resolution (simulating multi-resource startup) ─────────

  bench.add('RuntimeConfig - batch resolve 10 resources', () => {
    for (let i = 0; i < 10; i++) {
      resolveRuntimeOptions({ mode: 'STANDALONE' })
    }
  })

  bench.add('RuntimeConfig - batch resolve + validate 10 resources', () => {
    for (let i = 0; i < 10; i++) {
      const opts = resolveRuntimeOptions({ mode: 'STANDALONE' })
      validateRuntimeOptions(opts)
    }
  })

  return bench
}
