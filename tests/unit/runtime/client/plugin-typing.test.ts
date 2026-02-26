import { describe, expect, it } from 'vitest'
import type { OpenCoreClientPlugin } from '../../../../src/runtime/client'
import { createClientRuntime } from '../../../../src/runtime/client/client-api-runtime'

declare module '../../../../src/runtime/client' {
  interface ClientPluginApi {
    ExampleClientDecorator: (name: string) => string
  }
}

describe('ClientPluginApi typing', () => {
  it('exposes plugin contracts from the client entrypoint', () => {
    const plugin: OpenCoreClientPlugin = {
      name: 'example-client',
      install() {},
    }

    expect(plugin.name).toBe('example-client')
  })

  it('supports module augmentation for plugin extensions', () => {
    const runtime = createClientRuntime()
    runtime.registerApiExtension('ExampleClientDecorator', (name: string) => `hello:${name}`)

    expect(runtime.ExampleClientDecorator('npc')).toBe('hello:npc')
  })
})
