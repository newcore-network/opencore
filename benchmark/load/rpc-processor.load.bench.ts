import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { Player } from '../../src/runtime/server/entities/player'
import { generateSchemaFromTypes } from '../../src/runtime/server/system/schema-generator'
import { processTupleSchema } from '../../src/runtime/server/helpers/process-tuple-schema'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'

/**
 * Load benchmarks for the RPC processing pipeline.
 *
 * Simulates the validation and schema generation steps that occur
 * during RPC handling, without requiring full DI or transport layer.
 */
describe('RPC Processor Load Benchmarks', () => {
  const scenarios = getAllScenarios()

  // ── Schema generation under load ─────────────────────────────────

  describe('Schema generation', () => {
    for (const count of scenarios) {
      it(`Generate schema for ${count} methods (simple types)`, () => {
        const timings: number[] = []

        for (let i = 0; i < count; i++) {
          const start = performance.now()
          generateSchemaFromTypes([Player, String, Number])
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `RPC - Schema generation simple (${count} methods)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })

      it(`Generate schema for ${count} methods (complex types)`, () => {
        const timings: number[] = []

        for (let i = 0; i < count; i++) {
          const start = performance.now()
          generateSchemaFromTypes([Player, String, Number, Boolean, String, Number])
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `RPC - Schema generation complex (${count} methods)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })
    }
  })

  // ── Validation pipeline under load ───────────────────────────────

  describe('Validation pipeline', () => {
    const simpleSchema = generateSchemaFromTypes([Player, String])!
    const complexSchema = generateSchemaFromTypes([Player, String, Number, Boolean])!
    const arraySchema = generateSchemaFromTypes([Player, String, Array])!

    for (const count of scenarios) {
      it(`Validate ${count} simple RPC args`, () => {
        const timings: number[] = []

        for (let i = 0; i < count; i++) {
          const args = [`value-${i}`]
          const start = performance.now()
          const processed = processTupleSchema(simpleSchema, args)
          simpleSchema.parse(processed)
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `RPC - Validate simple args (${count} ops)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })

      it(`Validate ${count} complex RPC args`, () => {
        const timings: number[] = []

        for (let i = 0; i < count; i++) {
          const args = [`action-${i}`, `${i * 10}`, 'true']
          const start = performance.now()
          const processed = processTupleSchema(complexSchema, args)
          complexSchema.parse(processed)
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `RPC - Validate complex args (${count} ops)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })

      it(`Validate ${count} RPC args with greedy array`, () => {
        const timings: number[] = []

        for (let i = 0; i < count; i++) {
          const args = [`cmd-${i}`, 'arg1', 'arg2', 'arg3']
          const start = performance.now()
          const processed = processTupleSchema(arraySchema, args)
          arraySchema.parse(processed)
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `RPC - Validate greedy array args (${count} ops)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })
    }
  })

  // ── Validation error path ────────────────────────────────────────

  describe('Validation error path', () => {
    const strictSchema = z.tuple([z.string().min(1), z.coerce.number().positive()])

    for (const count of scenarios) {
      it(`Handle ${count} validation errors (safeParse)`, () => {
        const timings: number[] = []
        let errorCount = 0

        for (let i = 0; i < count; i++) {
          const args = ['', '-5'] // both invalid
          const start = performance.now()
          const result = strictSchema.safeParse(args)
          if (!result.success) errorCount++
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `RPC - Validation error path (${count} ops)`,
          count,
          count - errorCount,
          errorCount,
        )
        expect(errorCount).toBe(count)
        reportLoadMetric(metrics)
      })
    }
  })

  // ── Concurrent RPC simulation ────────────────────────────────────

  describe('Concurrent RPC simulation', () => {
    const schema = generateSchemaFromTypes([Player, String, Number])!

    for (const count of scenarios) {
      it(`Concurrent ${count} RPCs (Promise.all)`, async () => {
        const timings: number[] = []

        const rpcs = Array.from({ length: count }, (_, i) => {
          return async () => {
            const start = performance.now()
            const args = [`action-${i}`, `${i}`]
            const processed = processTupleSchema(schema, args)
            schema.parse(processed)
            // Simulate minimal async handler
            await Promise.resolve({ success: true, id: i })
            const end = performance.now()
            timings.push(end - start)
          }
        })

        await Promise.all(rpcs.map((fn) => fn()))

        const metrics = calculateLoadMetrics(
          timings,
          `RPC - Concurrent RPCs (${count} parallel)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })
    }
  })

  // ── Full RPC pipeline (generate + process + validate + handler) ──

  describe('Full RPC pipeline', () => {
    for (const count of scenarios) {
      it(`Full pipeline ${count} RPCs`, () => {
        const timings: number[] = []

        for (let i = 0; i < count; i++) {
          const start = performance.now()

          // 1. Generate schema (cached in real usage, but measuring worst case)
          const schema = generateSchemaFromTypes([Player, String, Number])!

          // 2. Process tuple
          const args = [`transfer`, `${i * 100}`]
          const processed = processTupleSchema(schema, args)

          // 3. Validate
          const validated = schema.parse(processed)

          // 4. Simulate handler execution
          const result = { success: true, amount: validated }

          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `RPC - Full pipeline (${count} ops)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })
    }
  })
})
