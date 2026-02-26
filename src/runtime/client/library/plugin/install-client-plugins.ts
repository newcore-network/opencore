import { di } from '../../client-container'
import type { ClientInitOptions } from '../../client-runtime'
import { Client } from '../../client-api-runtime'
import { PluginRegistry } from './plugin-registry'
import type { OpenCoreClientPlugin } from './plugin.interface'

function createConfigAccessor(options: ClientInitOptions) {
  const runtimeOptions = {
    mode: options.mode ?? 'CORE',
  }

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

export async function installClientPlugins(
  plugins: OpenCoreClientPlugin[],
  options: ClientInitOptions,
): Promise<void> {
  if (plugins.length === 0) return

  const registry = new PluginRegistry()

  await registry.installAll(plugins, {
    client: Client,
    di: {
      register(token: any, value: any) {
        di.registerInstance(token, value)
      },
    },
    config: createConfigAccessor(options),
  })
}
