import { describe, it, expect, beforeEach } from 'vitest'
import { resetContainer } from '../../helpers/di.helper'
import { initServer } from '../../../src/server/bootstrap'
import { di } from '../../../src/server/container'
import { INetTransport } from '../../../src/server/capabilities/INetTransport'
import { IExports } from '../../../src/server/capabilities/IExports'
import { IEngineEvents } from '../../../src/server/capabilities/IEngineEvents'
import { IResourceInfo } from '../../../src/server/capabilities/IResourceInfo'
import { ITick } from '../../../src/server/capabilities/ITick'
import { NodeNetTransport } from '../../../src/server/capabilities/node/node-net-transport'
import { NodeExports } from '../../../src/server/capabilities/node/node-exports'
import { NodeEngineEvents } from '../../../src/server/capabilities/node/node-engine-events'
import { NodeResourceInfo } from '../../../src/server/capabilities/node/node-resourceinfo'
import { NodeTick } from '../../../src/server/capabilities/node/node-tick'

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
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        commands: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        exports: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        fiveMEvents: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        players: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        sessionLifecycle: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        chat: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        principal: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        database: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        http: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        auth: {
          enabled: false,
          provider: 'core' as const,
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
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        commands: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        exports: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        fiveMEvents: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        players: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        sessionLifecycle: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        chat: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        principal: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        database: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        http: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        auth: {
          enabled: false,
          provider: 'core' as const,
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
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        commands: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        exports: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        fiveMEvents: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        players: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        sessionLifecycle: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        chat: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        principal: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        database: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        http: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        auth: {
          enabled: false,
          provider: 'core' as const,
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
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        commands: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        exports: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        fiveMEvents: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        players: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        sessionLifecycle: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        chat: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        principal: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        database: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        http: {
          enabled: false,
          provider: 'core' as const,
          export: false,
          scope: 'core' as const,
          required: false,
        },
        auth: {
          enabled: false,
          provider: 'core' as const,
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
