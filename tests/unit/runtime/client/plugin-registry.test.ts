import { describe, expect, it, vi } from 'vitest'
import {
  PluginRegistry,
  type PluginInstallContext,
  type OpenCoreClientPlugin,
} from '../../../../src/runtime/client/library/plugin'
import { createClientRuntime } from '../../../../src/runtime/client/client-api-runtime'

describe('Client PluginRegistry', () => {
  it('installs plugins in order', async () => {
    const calls: string[] = []
    const registry = new PluginRegistry()

    const ctx: PluginInstallContext = {
      client: createClientRuntime(),
      di: { register: vi.fn() },
      config: { get: vi.fn() },
    }

    const plugins: OpenCoreClientPlugin[] = [
      {
        name: 'first',
        install: async () => {
          calls.push('first')
        },
      },
      {
        name: 'second',
        install: () => {
          calls.push('second')
        },
      },
    ]

    await registry.installAll(plugins, ctx)

    expect(calls).toEqual(['first', 'second'])
  })

  it('throws when duplicate plugin names are installed', async () => {
    const registry = new PluginRegistry()
    const ctx: PluginInstallContext = {
      client: createClientRuntime(),
      di: { register: vi.fn() },
      config: { get: vi.fn() },
    }

    await registry.installAll([{ name: 'duplicate', install: vi.fn() }], ctx)

    await expect(
      registry.installAll([{ name: 'duplicate', install: vi.fn() }], ctx),
    ).rejects.toThrow('Plugin "duplicate" already installed')
  })
})

describe('Client plugin API extensions', () => {
  it('registers an api extension on the runtime instance', () => {
    const runtime = createClientRuntime()
    const extension = vi.fn()

    runtime.registerApiExtension('Test', extension)

    expect((runtime as any).Test).toBe(extension)
  })

  it('prevents duplicate extension keys', () => {
    const runtime = createClientRuntime()

    runtime.registerApiExtension('Test', vi.fn())

    expect(() => runtime.registerApiExtension('Test', vi.fn())).toThrow(
      'Client API "Test" already registered',
    )
  })

  it('rejects empty extension keys', () => {
    const runtime = createClientRuntime()

    expect(() => runtime.registerApiExtension('', vi.fn())).toThrow(
      'Client API extension key must be a non-empty string',
    )
  })

  it('rejects reserved extension keys', () => {
    const runtime = createClientRuntime()

    expect(() => runtime.registerApiExtension('constructor', vi.fn())).toThrow(
      'Client API extension key "constructor" is reserved',
    )
  })
})
