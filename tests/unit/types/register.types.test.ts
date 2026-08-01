import { describe, expectTypeOf, it } from 'vitest'
import type {
  ArgsOf,
  ClientEvents,
  Commands,
  DropFirst,
  IsRegistered,
  NameOf,
  PayloadOf,
  RpcArgsOf,
  RpcResultOf,
  ServerEvents,
  ServerRpc,
  StrictNameOf,
  ViewSend,
} from '../../../src/runtime/shared/types/register'
import { SYSTEM_EVENTS } from '../../../src/runtime/shared/types/system-types'
import type { SystemEventName } from '../../../src/runtime/shared/types/system-types'

interface GeneratedEvents {
  'hud:setCash': [amount: number]
  'hud:toggle': [visible: boolean, animate: boolean]
}

interface GeneratedRpc {
  'bank:getBalance': { args: [accountId: string]; result: number }
}

interface GeneratedViews {
  'hud:update': { cash: number }
}

describe('typegen inactive', () => {
  it('widens every event name back to string', () => {
    expectTypeOf<NameOf<ClientEvents>>().toEqualTypeOf<string>()
    expectTypeOf<NameOf<ServerEvents>>().toEqualTypeOf<string>()
    expectTypeOf<NameOf<Commands>>().toEqualTypeOf<string>()
  })

  it('widens payloads and RPC signatures', () => {
    expectTypeOf<ArgsOf<ClientEvents, 'anything'>>().toEqualTypeOf<unknown[]>()
    expectTypeOf<RpcArgsOf<ServerRpc, 'anything'>>().toEqualTypeOf<unknown[]>()
    expectTypeOf<RpcResultOf<ServerRpc, 'anything'>>().toEqualTypeOf<unknown>()
  })

  it('keeps WebView payloads at any rather than unknown', () => {
    expectTypeOf<PayloadOf<ViewSend, 'anything'>>().toEqualTypeOf<any>()
  })

  it('reports itself as unregistered', () => {
    expectTypeOf<IsRegistered<ClientEvents>>().toEqualTypeOf<false>()
  })
})

describe('non-strict mode', () => {
  it('accepts the generated names', () => {
    expectTypeOf<'hud:setCash'>().toExtend<NameOf<GeneratedEvents>>()
  })

  it('still accepts any other string, so enabling typegen breaks nothing', () => {
    expectTypeOf<'not:generated'>().toExtend<NameOf<GeneratedEvents>>()
  })
})

describe('strict mode', () => {
  it('narrows to exactly the generated names', () => {
    expectTypeOf<StrictNameOf<GeneratedEvents>>().toEqualTypeOf<'hud:setCash' | 'hud:toggle'>()
  })

  it('rejects a name no handler declares', () => {
    expectTypeOf<'not:generated'>().not.toExtend<StrictNameOf<GeneratedEvents>>()
  })

  it('admits framework events through the namespace pattern', () => {
    expectTypeOf<typeof SYSTEM_EVENTS.chat.message>().toExtend<`opencore:${string}`>()
  })

  it('pins SystemEventName as currently never', () => {
    expectTypeOf<[SystemEventName]>().toEqualTypeOf<[never]>()
  })
})

describe('payload extraction', () => {
  it('narrows event payloads to the handler signature', () => {
    expectTypeOf<ArgsOf<GeneratedEvents, 'hud:setCash'>>().toEqualTypeOf<[amount: number]>()
    expectTypeOf<ArgsOf<GeneratedEvents, 'hud:toggle'>>().toEqualTypeOf<
      [visible: boolean, animate: boolean]
    >()
  })

  it('narrows RPC arguments and results', () => {
    expectTypeOf<RpcArgsOf<GeneratedRpc, 'bank:getBalance'>>().toEqualTypeOf<[accountId: string]>()
    expectTypeOf<RpcResultOf<GeneratedRpc, 'bank:getBalance'>>().toEqualTypeOf<number>()
  })

  it('narrows WebView payloads', () => {
    expectTypeOf<PayloadOf<GeneratedViews, 'hud:update'>>().toEqualTypeOf<{ cash: number }>()
  })

  it('reports a generated map as registered', () => {
    expectTypeOf<IsRegistered<GeneratedEvents>>().toEqualTypeOf<true>()
  })
})

describe('DropFirst', () => {
  it('strips the leading parameter', () => {
    expectTypeOf<DropFirst<[player: object, amount: number]>>().toEqualTypeOf<[amount: number]>()
  })

  it('leaves an empty tuple when there was only the player', () => {
    expectTypeOf<DropFirst<[player: object]>>().toEqualTypeOf<[]>()
  })

  it('falls back to unknown[] for an empty tuple', () => {
    expectTypeOf<DropFirst<[]>>().toEqualTypeOf<unknown[]>()
  })
})
