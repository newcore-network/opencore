import { describe, expect, it } from 'vitest'
import type { OpenCorePlugin } from '../../../../src/runtime/server'
import { createServerRuntime } from '../../../../src/runtime/server/server.runtime'

declare module '../../../../src/runtime/server' {
  interface ServerPluginApi {
    ExampleDecorator: (name: string) => string
  }
}

describe('ServerPluginApi typing', () => {
  it('exposes plugin contracts from the server entrypoint', () => {
    const plugin: OpenCorePlugin = {
      name: 'example',
      install() {},
    }

    expect(plugin.name).toBe('example')
  })

  it('supports module augmentation for plugin extensions', () => {
    const runtime = createServerRuntime()
    runtime.registerApiExtension('ExampleDecorator', (name: string) => `hello:${name}`)

    expect(runtime.ExampleDecorator('npc')).toBe('hello:npc')
  })
})
