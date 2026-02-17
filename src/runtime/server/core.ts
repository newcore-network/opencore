import { GLOBAL_CONTAINER } from '../../kernel/di/container'
import { PluginRegistry, type OpenCorePlugin } from '../core/plugin'
import { Server } from './server.runtime'
import { initServer } from './bootstrap'
import {
  type FrameworkMode,
  resolveRuntimeOptions,
  type ServerInitOptions,
  type ServerRuntimeOptions,
} from './runtime'

export let _mode: FrameworkMode

export interface OpenCoreInitOptions extends ServerInitOptions {
  plugins?: OpenCorePlugin[]
}

function createConfigAccessor(options: ServerRuntimeOptions) {
  return {
    get<T = any>(key: string): T | undefined {
      const segments = key.split('.').filter(Boolean)
      let current: unknown = options

      for (const segment of segments) {
        if (typeof current !== 'object' || current === null) {
          return undefined
        }
        current = (current as Record<string, unknown>)[segment]
      }

      return current as T | undefined
    },
  }
}

export async function init(options: OpenCoreInitOptions) {
  const resolved: ServerRuntimeOptions = resolveRuntimeOptions(options)
  _mode = resolved.mode

  const registry = new PluginRegistry()
  await registry.installAll(options.plugins ?? [], {
    server: Server,
    di: {
      register(token: any, value: any) {
        GLOBAL_CONTAINER.registerInstance(token, value)
      },
    },
    config: createConfigAccessor(resolved),
  })

  await initServer(resolved)
}
