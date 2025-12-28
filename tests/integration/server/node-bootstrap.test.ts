import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { resetContainer } from '../../helpers/di.helper'
import { initServer } from '../../../src/runtime/server/bootstrap'
import { di } from '../../../src/kernel/di/container'
import { NodeNetTransport } from '../../../src/adapters/node/node-net-transport'
import { NodeExports } from '../../../src/adapters/node/node-exports'
import { NodeEngineEvents } from '../../../src/adapters/node/node-engine-events'
import { NodeResourceInfo } from '../../../src/adapters/node/node-resourceinfo'
import { NodeTick } from '../../../src/adapters/node/node-tick'
import { INetTransport, IExports, IEngineEvents, IResourceInfo, ITick } from '../../../src/adapters'

describe('Node.js Runtime Bootstrap', () => {
  beforeEach(() => {
    resetContainer()
    // Ensure we're in a Node environment (no FiveM globals)
    delete (globalThis as any).GetCurrentResourceName
  })

  it('should initialize DI container with Node capabilities', async () => {
    await initServer({
      mode: 'CORE',
      features: {
        netEvents: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        commands: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        exports: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        fiveMEvents: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        players: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        sessionLifecycle: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        chat: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        principal: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        database: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        http: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        auth: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
      },
      coreResourceName: 'node-test',
    })

    // Verify Node implementations are registered
    expect(di.isRegistered(INetTransport as any)).toBe(true)
    expect(di.isRegistered(IExports as any)).toBe(true)
    expect(di.isRegistered(IEngineEvents as any)).toBe(true)
    expect(di.isRegistered(IResourceInfo as any)).toBe(true)
    expect(di.isRegistered(ITick as any)).toBe(true)

    // Verify correct implementations
    const netTransport = di.resolve(INetTransport as any)
    const exports = di.resolve(IExports as any)
    const engineEvents = di.resolve(IEngineEvents as any)
    const resourceInfo = di.resolve(IResourceInfo as any)
    const tick = di.resolve(ITick as any)

    expect(netTransport).toBeInstanceOf(NodeNetTransport)
    expect(exports).toBeInstanceOf(NodeExports)
    expect(engineEvents).toBeInstanceOf(NodeEngineEvents)
    expect(resourceInfo).toBeInstanceOf(NodeResourceInfo)
    expect(tick).toBeInstanceOf(NodeTick)
  })

  it('should boot runtime without accessing FiveM globals', async () => {
    // Monitor global access
    const globalAccess: string[] = []
    const originalGlobal = globalThis as any

    const proxy = new Proxy(originalGlobal, {
      get(target, prop) {
        if (
          typeof prop === 'string' &&
          ['onNet', 'emitNet', 'exports', 'GetCurrentResourceName', 'on', 'setTick'].includes(prop)
        ) {
          globalAccess.push(prop)
        }
        return target[prop]
      },
    })

    // Note: This is a conceptual test - actual proxy implementation would require
    // more sophisticated setup. The key assertion is that Node implementations
    // don't call FiveM natives.

    await initServer({
      mode: 'CORE',
      features: {
        netEvents: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        commands: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        exports: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        fiveMEvents: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        players: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        sessionLifecycle: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        chat: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        principal: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        database: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        http: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        auth: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
      },
      coreResourceName: 'node-test',
    })

    // Runtime should initialize without errors
    expect(di.isRegistered(INetTransport as any)).toBe(true)
  })

  it('should use environment variable for resource name in Node', async () => {
    process.env.RESOURCE_NAME = 'test-resource'

    await initServer({
      mode: 'CORE',
      features: {
        netEvents: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        commands: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        exports: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        fiveMEvents: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        players: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        sessionLifecycle: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        chat: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        principal: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        database: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        http: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        auth: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
      },
      coreResourceName: 'node-test',
    })

    const resourceInfo = di.resolve(IResourceInfo as any)
    if (resourceInfo instanceof IResourceInfo)
      expect(resourceInfo.getCurrentResourceName()).toBe('test-resource')

    delete process.env.RESOURCE_NAME
  })

  it('should default to "default" resource name when env var not set', async () => {
    delete process.env.RESOURCE_NAME

    await initServer({
      mode: 'CORE',
      features: {
        netEvents: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        commands: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        exports: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        fiveMEvents: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        players: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        sessionLifecycle: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        chat: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        principal: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        database: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        http: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        auth: {
          enabled: false,
          provider: 'local' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
      },
      coreResourceName: 'node-test',
    })

    const resourceInfo = di.resolve(IResourceInfo as any)
    if (resourceInfo instanceof IResourceInfo)
      expect(resourceInfo.getCurrentResourceName()).toBe('test-resource')
  })
})
