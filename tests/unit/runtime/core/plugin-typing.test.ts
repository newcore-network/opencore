import { describe, expect, it } from 'vitest'
import { createServerRuntime } from '../../../../src/runtime/server/server.runtime'

declare module '../../../../src/runtime/server/plugin/server-plugin-api' {
  interface ServerPluginApi {
    ExampleDecorator: (name: string) => string
  }
}

describe('ServerPluginApi typing', () => {
  it('supports module augmentation for plugin extensions', () => {
    const runtime = createServerRuntime()
    runtime.registerApiExtension('ExampleDecorator', (name: string) => `hello:${name}`)

    expect(runtime.ExampleDecorator('npc')).toBe('hello:npc')
  })
})
