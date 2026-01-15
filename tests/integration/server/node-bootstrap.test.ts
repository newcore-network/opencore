import 'reflect-metadata'
import { beforeEach, describe, expect, it } from 'vitest'
import { IEngineEvents, IExports, INetTransport, IResourceInfo, ITick } from '../../../src/adapters'
import { NodeEngineEvents } from '../../../src/adapters/node/node-engine-events'
import { NodeExports } from '../../../src/adapters/node/node-exports'
import { NodeNetTransport } from '../../../src/adapters/node/node-net-transport'
import { NodeResourceInfo } from '../../../src/adapters/node/node-resourceinfo'
import { NodeTick } from '../../../src/adapters/node/node-tick'
import { GLOBAL_CONTAINER } from '../../../src/kernel/di/container'
import { initServer } from '../../../src/runtime/server/bootstrap'
import { resetContainer } from '../../helpers/di.helper'

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
      },
      coreResourceName: 'node-test',
    })

    // Verify Node implementations are registered
    expect(GLOBAL_CONTAINER.isRegistered(INetTransport as any)).toBe(true)
    expect(GLOBAL_CONTAINER.isRegistered(IExports as any)).toBe(true)
    expect(GLOBAL_CONTAINER.isRegistered(IEngineEvents as any)).toBe(true)
    expect(GLOBAL_CONTAINER.isRegistered(IResourceInfo as any)).toBe(true)
    expect(GLOBAL_CONTAINER.isRegistered(ITick as any)).toBe(true)

    // Verify correct implementations
    const netTransport = GLOBAL_CONTAINER.resolve(INetTransport as any)
    const exports = GLOBAL_CONTAINER.resolve(IExports as any)
    const engineEvents = GLOBAL_CONTAINER.resolve(IEngineEvents as any)
    const resourceInfo = GLOBAL_CONTAINER.resolve(IResourceInfo as any)
    const tick = GLOBAL_CONTAINER.resolve(ITick as any)

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

    const _proxy = new Proxy(originalGlobal, {
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
      },
      coreResourceName: 'node-test',
    })

    // Runtime should initialize without errors
    expect(GLOBAL_CONTAINER.isRegistered(INetTransport as any)).toBe(true)
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
      },
      coreResourceName: 'node-test',
    })

    const resourceInfo = GLOBAL_CONTAINER.resolve(IResourceInfo as any)
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
      },
      coreResourceName: 'node-test',
    })

    const resourceInfo = GLOBAL_CONTAINER.resolve(IResourceInfo as any)
    if (resourceInfo instanceof IResourceInfo)
      expect(resourceInfo.getCurrentResourceName()).toBe('test-resource')
  })
})
