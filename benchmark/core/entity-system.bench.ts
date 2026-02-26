import { Bench } from 'tinybench'
import { EntityFactory } from '../utils/entity-factory'

/**
 * Benchmarks for the BaseEntity system: state management, metadata,
 * snapshot/restore operations at varying complexity levels.
 */
export async function runEntitySystemBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  // ── State management ─────────────────────────────────────────────

  bench.add('Entity - add/has/delete 1 state', () => {
    const entity = EntityFactory.create('minimal')
    entity.add('active')
    entity.has('active')
    entity.delete('active')
  })

  bench.add('Entity - add/has/delete 10 states', () => {
    const entity = EntityFactory.create('minimal')
    for (let i = 0; i < 10; i++) {
      entity.add(`state-${i}`)
    }
    for (let i = 0; i < 10; i++) {
      entity.has(`state-${i}`)
    }
    for (let i = 0; i < 10; i++) {
      entity.delete(`state-${i}`)
    }
  })

  bench.add('Entity - add/has/delete 50 states', () => {
    const entity = EntityFactory.create('minimal')
    for (let i = 0; i < 50; i++) {
      entity.add(`state-${i}`)
    }
    for (let i = 0; i < 50; i++) {
      entity.has(`state-${i}`)
    }
    for (let i = 0; i < 50; i++) {
      entity.delete(`state-${i}`)
    }
  })

  bench.add('Entity - toggle 10 states', () => {
    const entity = EntityFactory.create('minimal')
    for (let i = 0; i < 10; i++) {
      entity.toggle(`state-${i}`)
    }
    for (let i = 0; i < 10; i++) {
      entity.toggle(`state-${i}`)
    }
  })

  bench.add('Entity - clearStates (50 states)', () => {
    const entity = EntityFactory.create('heavy')
    entity.clearStates()
  })

  // ── Metadata management ──────────────────────────────────────────

  bench.add('Entity - setMeta/getMeta 1 key', () => {
    const entity = EntityFactory.create('minimal')
    entity.setMeta('health', 100)
    entity.getMeta('health')
  })

  bench.add('Entity - setMeta/getMeta 10 keys', () => {
    const entity = EntityFactory.create('minimal')
    for (let i = 0; i < 10; i++) {
      entity.setMeta(`key-${i}`, { value: i })
    }
    for (let i = 0; i < 10; i++) {
      entity.getMeta(`key-${i}`)
    }
  })

  bench.add('Entity - setMeta/getMeta 100 keys', () => {
    const entity = EntityFactory.create('minimal')
    for (let i = 0; i < 100; i++) {
      entity.setMeta(`key-${i}`, { value: i, nested: { data: `data-${i}` } })
    }
    for (let i = 0; i < 100; i++) {
      entity.getMeta(`key-${i}`)
    }
  })

  bench.add('Entity - hasMeta + deleteMeta (10 keys)', () => {
    const entity = EntityFactory.create('minimal')
    for (let i = 0; i < 10; i++) {
      entity.setMeta(`key-${i}`, i)
    }
    for (let i = 0; i < 10; i++) {
      entity.hasMeta(`key-${i}`)
      entity.deleteMeta(`key-${i}`)
    }
  })

  bench.add('Entity - getAllMeta (20 keys)', () => {
    const entity = EntityFactory.create('complex')
    entity.getAllMeta()
  })

  bench.add('Entity - clearMeta (100 keys)', () => {
    const entity = EntityFactory.create('heavy')
    entity.clearMeta()
  })

  // ── Snapshot / Restore ───────────────────────────────────────────

  bench.add('Entity - snapshot (minimal)', () => {
    const entity = EntityFactory.create('minimal')
    entity.snapshot()
  })

  bench.add('Entity - snapshot (simple)', () => {
    const entity = EntityFactory.create('simple')
    entity.snapshot()
  })

  bench.add('Entity - snapshot (complex)', () => {
    const entity = EntityFactory.create('complex')
    entity.snapshot()
  })

  bench.add('Entity - snapshot (heavy)', () => {
    const entity = EntityFactory.create('heavy')
    entity.snapshot()
  })

  const complexEntity = EntityFactory.create('complex')
  const complexSnapshot = complexEntity.snapshot()

  bench.add('Entity - restore from snapshot (complex)', () => {
    const entity = EntityFactory.create('minimal')
    entity.restore(complexSnapshot)
  })

  const heavyEntity = EntityFactory.create('heavy')
  const heavySnapshot = heavyEntity.snapshot()

  bench.add('Entity - restore from snapshot (heavy)', () => {
    const entity = EntityFactory.create('minimal')
    entity.restore(heavySnapshot)
  })

  // ── Batch entity creation ────────────────────────────────────────

  bench.add('Entity - create 100 simple entities', () => {
    for (let i = 0; i < 100; i++) {
      EntityFactory.create('simple')
    }
  })

  bench.add('Entity - create 100 complex entities', () => {
    for (let i = 0; i < 100; i++) {
      EntityFactory.create('complex')
    }
  })

  return bench
}
