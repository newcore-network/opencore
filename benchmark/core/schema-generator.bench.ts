import 'reflect-metadata'
import { Bench } from 'tinybench'
import { z } from 'zod'
import { Player } from '../../src/runtime/server/entities/player'
import { generateSchemaFromTypes } from '../../src/runtime/server/system/schema-generator'
import { processTupleSchema } from '../../src/runtime/server/helpers/process-tuple-schema'

/**
 * Benchmarks for the automatic schema generation system and tuple processing.
 */
export async function runSchemaGeneratorBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  // ── generateSchemaFromTypes ──────────────────────────────────────

  bench.add('SchemaGenerator - 1 param (Player, String)', () => {
    generateSchemaFromTypes([Player, String])
  })

  bench.add('SchemaGenerator - 3 params (Player, String, Number, Boolean)', () => {
    generateSchemaFromTypes([Player, String, Number, Boolean])
  })

  bench.add('SchemaGenerator - 5 params (Player, String, Number, Boolean, String, Number)', () => {
    generateSchemaFromTypes([Player, String, Number, Boolean, String, Number])
  })

  bench.add('SchemaGenerator - with Array (Player, String, Array)', () => {
    generateSchemaFromTypes([Player, String, Array])
  })

  bench.add('SchemaGenerator - Player only (no args)', () => {
    generateSchemaFromTypes([Player])
  })

  bench.add('SchemaGenerator - empty params', () => {
    generateSchemaFromTypes([])
  })

  // ── processTupleSchema: greedy grouping ──────────────────────────

  const tupleStringArray = z.tuple([z.string(), z.array(z.string())])
  const tupleStringString = z.tuple([z.string(), z.string()])
  const tupleNumberStringArray = z.tuple([z.coerce.number(), z.string(), z.array(z.string())])

  // More args than items → ZodArray grouping
  bench.add('processTupleSchema - greedy ZodArray (3 args → 2 items)', () => {
    processTupleSchema(tupleStringArray, ['hello', 'world', '!'])
  })

  // More args than items → ZodString join
  bench.add('processTupleSchema - greedy ZodString join (3 args → 2 items)', () => {
    processTupleSchema(tupleStringString, ['hello', 'world', '!'])
  })

  // Exact match with ZodArray at end
  bench.add('processTupleSchema - exact match ZodArray', () => {
    processTupleSchema(tupleStringArray, ['hello', ['world', '!']])
  })

  // Exact match, last is ZodArray but arg is not array → wrap
  bench.add('processTupleSchema - exact match ZodArray wrap single', () => {
    processTupleSchema(tupleStringArray, ['hello', 'world'])
  })

  // No processing needed (exact match, no special last item)
  bench.add('processTupleSchema - passthrough (exact match)', () => {
    processTupleSchema(tupleStringString, ['hello', 'world'])
  })

  // Larger tuple with greedy
  bench.add('processTupleSchema - greedy ZodArray (6 args → 3 items)', () => {
    processTupleSchema(tupleNumberStringArray, ['42', 'cmd', 'arg1', 'arg2', 'arg3', 'arg4'])
  })

  // ── Generated schema vs manual schema parse speed ────────────────

  const generatedSchema = generateSchemaFromTypes([Player, Number, String])!
  const manualSchema = z.tuple([z.coerce.number(), z.string().min(1)])
  const testArgs = ['123', 'hello']

  bench.add('Schema parse - generated schema', () => {
    generatedSchema.parse(testArgs)
  })

  bench.add('Schema parse - manual equivalent schema', () => {
    manualSchema.parse(testArgs)
  })

  // ── Batch generation (simulating bootstrap scanning N methods) ───

  bench.add('SchemaGenerator - batch 10 methods', () => {
    for (let i = 0; i < 10; i++) {
      generateSchemaFromTypes([Player, String, Number])
    }
  })

  bench.add('SchemaGenerator - batch 50 methods', () => {
    for (let i = 0; i < 50; i++) {
      generateSchemaFromTypes([Player, String, Number])
    }
  })

  return bench
}
