import { describe, expectTypeOf, it } from 'vitest'
import { createLibraryBus } from '../../../src/runtime/core/library'
import type {
  LibraryBus,
  OpenCoreClientLibrary,
  OpenCoreServerLibrary,
} from '../../../src/runtime/core/library/types'
import type { createClientLibrary } from '../../../src/runtime/client/library'
import type { createServerLibrary } from '../../../src/runtime/server/library'
import type {
  LibraryEventNameIn,
  LibraryEventsOf,
  LibraryPayloadOf,
  ResolveMap,
} from '../../../src/runtime/shared/types/register'

type LooseLibraryMap = Record<string, Record<string, unknown>>
type EmptyRegistry = Record<never, never>

interface Spawned {
  accountId: string
  firstTime: boolean
}

interface RpResources {
  'resource:resources/characters': {
    serverLibraryEvents: { rp: { 'character:spawned': Spawned } }
  }
  'resource:resources/session': {
    serverLibraryEvents: {
      rp: { 'character:left': { accountId: string } }
      bank: { 'bank:opened': undefined }
    }
    clientLibraryEvents: { hud: { 'hud:shown': boolean } }
  }
}

interface StrictRegistry {
  strict: true
  'resource:resources/characters': {
    serverLibraryEvents: { rp: { 'character:spawned': Spawned } }
  }
}

type ServerLibs = ResolveMap<RpResources, 'serverLibraryEvents', LooseLibraryMap>
type RpEvents = LibraryEventsOf<ServerLibs, 'rp'>
type RpBus = LibraryBus<RpEvents>

/** A working bus viewed through the type under test, so the calls below also run. */
const busAs = <T>() => createLibraryBus() as unknown as T

describe('typegen inactive', () => {
  it('keeps the library name as a literal', () => {
    expectTypeOf<ReturnType<typeof createServerLibrary<'rp'>>>().toEqualTypeOf<
      OpenCoreServerLibrary<'rp'>
    >()
    expectTypeOf<ReturnType<typeof createClientLibrary<'hud'>>>().toEqualTypeOf<
      OpenCoreClientLibrary<'hud'>
    >()
    expectTypeOf<OpenCoreServerLibrary<'rp'>['name']>().toEqualTypeOf<'rp'>()
  })

  it('leaves every name and payload loose', () => {
    const rp = busAs<OpenCoreServerLibrary<'rp'>>()
    rp.emit('anything', { id: 1 })
    rp.emit('anything')
    rp.on('anything', (payload) => {
      expectTypeOf(payload).toEqualTypeOf<unknown>()
    })
  })

  it('still infers the payload from an annotated handler', () => {
    const rp = busAs<OpenCoreServerLibrary<'rp'>>()
    const handler = (_payload?: Spawned) => {}
    rp.on('character:spawned', handler)
    rp.once('character:spawned', handler)
    rp.off('character:spawned', handler)
  })

  it('assigns a named library to the default library type', () => {
    expectTypeOf<OpenCoreServerLibrary<'rp'>>().toExtend<OpenCoreServerLibrary>()
    expectTypeOf<OpenCoreClientLibrary<'hud'>>().toExtend<OpenCoreClientLibrary>()
  })

  it('still takes the payload as an explicit type argument', () => {
    const rp = busAs<OpenCoreServerLibrary<'rp'>>()
    rp.emit<Spawned>('character:spawned', { accountId: 'a', firstTime: true })
    // @ts-expect-error firstTime is missing
    rp.emit<Spawned>('character:spawned', { accountId: 'a' })
    rp.on<Spawned>('character:spawned', (payload) => {
      expectTypeOf(payload).toEqualTypeOf<Spawned | undefined>()
    })
  })

  it('stays loose for a library created from a wide name', () => {
    expectTypeOf<LibraryEventsOf<ServerLibs, string>>().toEqualTypeOf<Record<string, unknown>>()
  })
})

describe('LibraryEventsOf', () => {
  it('falls back when no resource registered library events', () => {
    type Libs = ResolveMap<EmptyRegistry, 'serverLibraryEvents', LooseLibraryMap>
    expectTypeOf<LibraryEventsOf<Libs, 'rp'>>().toEqualTypeOf<Record<string, unknown>>()
  })

  it('falls back for a library with no entry', () => {
    expectTypeOf<LibraryEventsOf<ServerLibs, 'garage'>>().toEqualTypeOf<Record<string, unknown>>()
  })

  it('merges the events every resource registered for the same library', () => {
    expectTypeOf<keyof RpEvents>().toEqualTypeOf<'character:spawned' | 'character:left'>()
  })

  it('keeps the server and client maps apart', () => {
    type ClientLibs = ResolveMap<RpResources, 'clientLibraryEvents', LooseLibraryMap>
    expectTypeOf<keyof LibraryEventsOf<ClientLibs, 'hud'>>().toEqualTypeOf<'hud:shown'>()
    expectTypeOf<LibraryEventsOf<ClientLibs, 'rp'>>().toEqualTypeOf<Record<string, unknown>>()
  })
})

describe('registered library', () => {
  it('narrows payloads to the listeners', () => {
    expectTypeOf<LibraryPayloadOf<RpEvents, 'character:spawned'>>().toEqualTypeOf<Spawned>()
    expectTypeOf<LibraryPayloadOf<RpEvents, 'character:left'>>().toEqualTypeOf<{
      accountId: string
    }>()
  })

  it('ignores TPayload for a generated name', () => {
    expectTypeOf<LibraryPayloadOf<RpEvents, 'character:spawned', string>>().toEqualTypeOf<Spawned>()
  })

  it('checks emitted payloads', () => {
    const rp = busAs<RpBus>()
    rp.emit('character:spawned', { accountId: 'a', firstTime: true })
    // @ts-expect-error firstTime is missing
    rp.emit('character:spawned', { accountId: 'a' })
    // @ts-expect-error wrong payload for this event
    rp.emit('character:left', { firstTime: true })
  })

  it('requires the payload of a generated event', () => {
    const rp = busAs<RpBus>()
    // @ts-expect-error character:spawned listeners read the payload
    rp.emit('character:spawned')
    rp.emit('other:event')

    type BankEvents = LibraryEventsOf<ServerLibs, 'bank'>
    busAs<LibraryBus<BankEvents>>().emit('bank:opened')
  })

  it('types listener payloads', () => {
    const rp = busAs<RpBus>()
    rp.on('character:spawned', (payload) => {
      expectTypeOf(payload).toEqualTypeOf<Spawned | undefined>()
    })
    rp.once('character:left', (payload) => {
      expectTypeOf(payload).toEqualTypeOf<{ accountId: string } | undefined>()
    })
  })

  it('assigns a typed library to the default library type', () => {
    expectTypeOf<OpenCoreServerLibrary<'rp', RpEvents>>().toExtend<OpenCoreServerLibrary>()
  })

  it('autocompletes known names and still accepts others outside strict mode', () => {
    expectTypeOf<'character:spawned'>().toExtend<LibraryEventNameIn<RpResources, RpEvents>>()
    expectTypeOf<'other:event'>().toExtend<LibraryEventNameIn<RpResources, RpEvents>>()

    const rp = busAs<RpBus>()
    rp.emit('other:event', 42)
  })
})

describe('strict mode', () => {
  type StrictEvents = LibraryEventsOf<
    ResolveMap<StrictRegistry, 'serverLibraryEvents', LooseLibraryMap>,
    'rp'
  >

  it('narrows to exactly the generated names', () => {
    expectTypeOf<
      LibraryEventNameIn<StrictRegistry, StrictEvents>
    >().toEqualTypeOf<'character:spawned'>()
  })

  it('admits no framework namespace on a library', () => {
    expectTypeOf<'opencore:anything'>().not.toExtend<
      LibraryEventNameIn<StrictRegistry, StrictEvents>
    >()
  })

  it('stays loose for an unregistered library', () => {
    expectTypeOf<
      LibraryEventNameIn<StrictRegistry, LibraryEventsOf<EmptyRegistry, 'garage'>>
    >().toEqualTypeOf<string>()
  })
})
