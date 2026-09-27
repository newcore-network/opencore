import { describe, expectTypeOf, it } from 'vitest'
import type {
  ArgsOf,
  IsStrictIn,
  NameOf,
  ResolveMap,
} from '../../../src/runtime/shared/types/register'

type LooseEventMap = Record<string, unknown[]>

type EmptyRegistry = {}

interface OneResource {
  'resource:resources/hud': {
    clientEvents: { 'hud:setCash': [amount: number] }
  }
}

interface TwoResources {
  'resource:resources/hud': {
    clientEvents: { 'hud:setCash': [amount: number] }
    serverEvents: { 'hud:ack': [id: string] }
  }
  'resource:resources/garage': {
    clientEvents: { 'garage:listChanged': [vehicles: string[]] }
  }
}

interface StrictRegistry {
  strict: true
  'resource:resources/hud': { clientEvents: { 'hud:setCash': [amount: number] } }
}

type MergedClientEvents = ResolveMap<TwoResources, 'clientEvents', LooseEventMap>

describe('ResolveMap', () => {
  it('falls back to the loose map when no resource registered anything', () => {
    expectTypeOf<
      ResolveMap<EmptyRegistry, 'clientEvents', LooseEventMap>
    >().toEqualTypeOf<LooseEventMap>()
  })

  it('falls back when resources exist but none declares that map', () => {
    expectTypeOf<
      ResolveMap<OneResource, 'serverEvents', LooseEventMap>
    >().toEqualTypeOf<LooseEventMap>()
  })

  it('resolves a single resource', () => {
    type Events = ResolveMap<OneResource, 'clientEvents', LooseEventMap>
    expectTypeOf<ArgsOf<Events, 'hud:setCash'>>().toEqualTypeOf<[amount: number]>()
  })

  it('merges the names of every resource into one map', () => {
    expectTypeOf<keyof MergedClientEvents>().toEqualTypeOf<'hud:setCash' | 'garage:listChanged'>()
  })

  it('keeps each payload attached to the resource that declared it', () => {
    expectTypeOf<ArgsOf<MergedClientEvents, 'hud:setCash'>>().toEqualTypeOf<[amount: number]>()
    expectTypeOf<ArgsOf<MergedClientEvents, 'garage:listChanged'>>().toEqualTypeOf<
      [vehicles: string[]]
    >()
  })

  it('merges each map independently', () => {
    expectTypeOf<
      keyof ResolveMap<TwoResources, 'serverEvents', LooseEventMap>
    >().toEqualTypeOf<'hud:ack'>()
  })

  it('reads only resource entries, never other registry keys', () => {
    expectTypeOf<ResolveMap<StrictRegistry, 'clientEvents', LooseEventMap>>().toEqualTypeOf<{
      'hud:setCash': [amount: number]
    }>()
  })
})

describe('NameOf over a merged map', () => {
  it('narrows to the names every resource declared', () => {
    expectTypeOf<'garage:listChanged'>().toExtend<NameOf<MergedClientEvents>>()
  })

  it('stays string while nothing is registered', () => {
    expectTypeOf<
      NameOf<ResolveMap<EmptyRegistry, 'clientEvents', LooseEventMap>>
    >().toEqualTypeOf<string>()
  })
})

describe('IsStrictIn', () => {
  it('detects the flag on the registry root', () => {
    expectTypeOf<IsStrictIn<StrictRegistry>>().toEqualTypeOf<true>()
  })

  it('is false when absent', () => {
    expectTypeOf<IsStrictIn<TwoResources>>().toEqualTypeOf<false>()
    expectTypeOf<IsStrictIn<EmptyRegistry>>().toEqualTypeOf<false>()
  })
})
