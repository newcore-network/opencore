import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { Player } from '../../../src/runtime/server/entities/player'

// Server decorator
import { OnRPC as ServerOnRPC } from '../../../src/runtime/server/decorators/onRPC'
import { METADATA_KEYS as SERVER_KEYS } from '../../../src/runtime/server/system/metadata-server.keys'

// Client decorator
import { OnRPC as ClientOnRPC } from '../../../src/runtime/client/decorators/onRPC'
import { METADATA_KEYS as CLIENT_KEYS } from '../../../src/runtime/client/system/metadata-client.keys'

describe('Server @OnRPC decorator', () => {
  it('should store metadata with eventName', () => {
    class TestController {
      @ServerOnRPC('server:test')
      async handle(_player: Player) {}
    }

    const metadata = Reflect.getMetadata(SERVER_KEYS.NET_RPC, TestController.prototype, 'handle')

    expect(metadata).toBeDefined()
    expect(metadata.eventName).toBe('server:test')
  })

  it('should store schema when provided as ZodType', () => {
    const schema = z.tuple([z.string()])

    class TestController {
      @ServerOnRPC('server:schema', schema)
      async handle(_player: Player, _name: string) {}
    }

    const metadata = Reflect.getMetadata(SERVER_KEYS.NET_RPC, TestController.prototype, 'handle')

    expect(metadata.schema).toBe(schema)
  })

  it('should store schema when provided as options object', () => {
    const schema = z.object({ id: z.number() })

    class TestController {
      @ServerOnRPC('server:opts', { schema })
      async handle(_player: Player, _dto: { id: number }) {}
    }

    const metadata = Reflect.getMetadata(SERVER_KEYS.NET_RPC, TestController.prototype, 'handle')

    expect(metadata.schema).toBe(schema)
  })

  it('should have undefined schema when not provided', () => {
    class TestController {
      @ServerOnRPC('server:noschema')
      async handle(_player: Player) {}
    }

    const metadata = Reflect.getMetadata(SERVER_KEYS.NET_RPC, TestController.prototype, 'handle')

    expect(metadata.schema).toBeUndefined()
  })

  it('should store paramTypes key in metadata (value depends on emitDecoratorMetadata)', () => {
    class TestController {
      @ServerOnRPC('server:types')
      async handle(_player: Player, _name: string, _count: number) {}
    }

    const metadata = Reflect.getMetadata(SERVER_KEYS.NET_RPC, TestController.prototype, 'handle')

    // paramTypes key must exist in metadata object
    expect('paramTypes' in metadata).toBe(true)
  })

  it('should use different metadata key than NET_EVENT', () => {
    expect(SERVER_KEYS.NET_RPC).not.toBe(SERVER_KEYS.NET_EVENT)
  })
})

describe('Client @OnRPC decorator', () => {
  it('should store metadata with eventName', () => {
    class TestController {
      @ClientOnRPC('client:test')
      async handle() {}
    }

    const metadata = Reflect.getMetadata(CLIENT_KEYS.NET_RPC, TestController.prototype, 'handle')

    expect(metadata).toBeDefined()
    expect(metadata.eventName).toBe('client:test')
  })

  it('should store schema when provided as ZodType', () => {
    const schema = z.tuple([z.string()])

    class TestController {
      @ClientOnRPC('client:schema', schema)
      async handle(_name: string) {}
    }

    const metadata = Reflect.getMetadata(CLIENT_KEYS.NET_RPC, TestController.prototype, 'handle')

    expect(metadata.schema).toBe(schema)
  })

  it('should store schema when provided as options object', () => {
    const schema = z.object({ id: z.number() })

    class TestController {
      @ClientOnRPC('client:opts', { schema })
      async handle(_dto: { id: number }) {}
    }

    const metadata = Reflect.getMetadata(CLIENT_KEYS.NET_RPC, TestController.prototype, 'handle')

    expect(metadata.schema).toBe(schema)
  })

  it('should have undefined schema when not provided', () => {
    class TestController {
      @ClientOnRPC('client:noschema')
      async handle() {}
    }

    const metadata = Reflect.getMetadata(CLIENT_KEYS.NET_RPC, TestController.prototype, 'handle')

    expect(metadata.schema).toBeUndefined()
  })

  it('should use different metadata key than NET_EVENT', () => {
    expect(CLIENT_KEYS.NET_RPC).not.toBe(CLIENT_KEYS.NET_EVENT)
  })

  it('should use different metadata key namespace than server', () => {
    expect(CLIENT_KEYS.NET_RPC).not.toBe(SERVER_KEYS.NET_RPC)
  })
})
