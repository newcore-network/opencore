import { GLOBAL_CONTAINER } from '../../kernel/di/container'
import { PluginRegistry, type OpenCorePlugin, type PluginInstallContext } from './library/plugin'
import { Server } from './server.runtime'
import { initServer } from './bootstrap'
import {
  type FrameworkMode,
  resolveRuntimeOptions,
  type ServerInitOptions,
  type ServerRuntimeOptions,
} from './runtime'
import { OpenCoreServerAdapter } from './adapter'

export let _mode: FrameworkMode

export interface OpenCoreInitOptions extends ServerInitOptions {
  plugins?: OpenCorePlugin[]
}

let _pendingAdapter: OpenCoreServerAdapter | undefined

export function useAdapter(adapter: OpenCoreServerAdapter): void {
  _pendingAdapter = adapter
}

function createConfigAccessor(options: ServerRuntimeOptions) {
  const runtimeOptions = { ...options }

  return {
    get<T = any>(key: string): T | undefined {
      const segments = key.split('.').filter(Boolean)
      let current: unknown = runtimeOptions

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
  if (!options.adapter && _pendingAdapter) {
    options = { ...options, adapter: _pendingAdapter }
  }

  const resolved: ServerRuntimeOptions = resolveRuntimeOptions(options)
  _mode = resolved.mode

  const registry = new PluginRegistry()
  const pluginContext: PluginInstallContext = {
    server: Server,
    di: {
      register(token: any, value: any) {
        GLOBAL_CONTAINER.registerInstance(token, value)
      },
    },
    config: createConfigAccessor(resolved),
  }

  await registry.installAll(options.plugins ?? [], pluginContext)

  await initServer(resolved, { registry, context: pluginContext })
}
