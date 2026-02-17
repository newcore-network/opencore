import { describe, expect, it, vi } from 'vitest'
import { PluginRegistry, type PluginInstallContext, type OpenCorePlugin } from '../../../../src/runtime/core/plugin'
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

    await registry.installAll(
      [
        { name: 'duplicate', install: vi.fn() },
      ],
      ctx,
    )

    await expect(
      registry.installAll(
        [
          { name: 'duplicate', install: vi.fn() },
        ],
        ctx,
      ),
    ).rejects.toThrow('Plugin "duplicate" already installed')
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

})
