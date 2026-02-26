import { describe, expect, it, vi } from 'vitest'
import {
  PluginRegistry,
  type PluginInstallContext,
  type OpenCorePlugin,
} from '../../../../src/runtime/server/library/plugin'
import { createServerRuntime } from '../../../../src/runtime/server/server.runtime'

describe('PluginRegistry', () => {
  it('installs plugins in order', async () => {
    const calls: string[] = []
    const registry = new PluginRegistry()

    const ctx: PluginInstallContext = {
      server: createServerRuntime(),
      di: { register: vi.fn() },
      config: { get: vi.fn() },
    }

    const plugins: OpenCorePlugin[] = [
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
      server: createServerRuntime(),
      di: { register: vi.fn() },
      config: { get: vi.fn() },
    }

    await registry.installAll([{ name: 'duplicate', install: vi.fn() }], ctx)

    await expect(
      registry.installAll([{ name: 'duplicate', install: vi.fn() }], ctx),
    ).rejects.toThrow('Plugin "duplicate" already installed')
  })

  it('starts plugins in install order when start hook exists', async () => {
    const calls: string[] = []
    const registry = new PluginRegistry()
    const ctx: PluginInstallContext = {
      server: createServerRuntime(),
      di: { register: vi.fn() },
      config: { get: vi.fn() },
    }

    const plugins: OpenCorePlugin[] = [
      {
        name: 'first',
        install: () => {
          calls.push('install:first')
        },
        start: () => {
          calls.push('start:first')
        },
      },
      {
        name: 'second',
        install: () => {
          calls.push('install:second')
        },
        start: () => {
          calls.push('start:second')
        },
      },
    ]

    await registry.installAll(plugins, ctx)
    await registry.startAll(ctx)

    expect(calls).toEqual(['install:first', 'install:second', 'start:first', 'start:second'])
  })

  it('includes plugin name when start hook fails', async () => {
    const registry = new PluginRegistry()
    const ctx: PluginInstallContext = {
      server: createServerRuntime(),
      di: { register: vi.fn() },
      config: { get: vi.fn() },
    }

    await registry.installAll(
      [
        {
          name: 'broken-plugin',
          install: vi.fn(),
          start: () => {
            throw new Error('boom')
          },
        },
      ],
      ctx,
    )

    await expect(registry.startAll(ctx)).rejects.toThrow(
      'Plugin "broken-plugin" failed to start: boom',
    )
  })
})

describe('Server plugin API extensions', () => {
  it('registers an api extension on the runtime instance', () => {
    const runtime = createServerRuntime()
    const extension = vi.fn()

    runtime.registerApiExtension('Test', extension)

    expect((runtime as any).Test).toBe(extension)
  })

  it('prevents duplicate extension keys', () => {
    const runtime = createServerRuntime()

    runtime.registerApiExtension('Test', vi.fn())

    expect(() => runtime.registerApiExtension('Test', vi.fn())).toThrow(
      'Server API "Test" already registered',
    )
  })

  it('rejects empty extension keys', () => {
    const runtime = createServerRuntime()

    expect(() => runtime.registerApiExtension('', vi.fn())).toThrow(
      'Server API extension key must be a non-empty string',
    )
  })

  it('rejects reserved extension keys', () => {
    const runtime = createServerRuntime()

    expect(() => runtime.registerApiExtension('constructor', vi.fn())).toThrow(
      'Server API extension key "constructor" is reserved',
    )
  })
})
