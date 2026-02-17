import * as BaseServerApi from './api'
import type { ServerPluginApi } from './plugin/server-plugin-api'

export type ServerApi = typeof BaseServerApi &
  ServerPluginApi & {
    registerApiExtension(key: string, value: unknown): void
  }

function attachApiExtensionRuntime(runtime: ServerApi): ServerApi {
  const dynamicApi: Record<string, unknown> = {}

  runtime.registerApiExtension = (key: string, value: unknown) => {
    if (Object.prototype.hasOwnProperty.call(dynamicApi, key) || key in runtime) {
      throw new Error(`Server API "${key}" already registered`)
    }

    dynamicApi[key] = value
    ;(runtime as unknown as Record<string, unknown>)[key] = value
  }

  return runtime
}

export function createServerRuntime(): ServerApi {
  const runtime = { ...(BaseServerApi as unknown as Record<string, unknown>) } as unknown as ServerApi
  return attachApiExtensionRuntime(runtime)
}

export const Server = attachApiExtensionRuntime(
  BaseServerApi as unknown as ServerApi,
)
