import * as BaseServerApi from './api'
import type { ServerPluginApi } from './library/plugin/server-plugin-api'

const RESERVED_SERVER_API_KEYS = new Set(['registerApiExtension', '__proto__', 'prototype', 'constructor'])

export type ServerApi = typeof BaseServerApi &
  ServerPluginApi & {
    registerApiExtension(key: string, value: unknown): void
  }

function assertExtensionKey(key: string): void {
  if (!key || key.trim().length === 0) {
    throw new Error('Server API extension key must be a non-empty string')
  }

  if (RESERVED_SERVER_API_KEYS.has(key)) {
    throw new Error(`Server API extension key "${key}" is reserved`)
  }
}

function attachApiExtensionRuntime(runtime: ServerApi): ServerApi {
  const dynamicApi: Record<string, unknown> = {}

  runtime.registerApiExtension = (key: string, value: unknown) => {
    assertExtensionKey(key)

    if (Object.hasOwn(dynamicApi, key) || key in runtime) {
      throw new Error(`Server API "${key}" already registered`)
    }

    dynamicApi[key] = value
    ;(runtime as unknown as Record<string, unknown>)[key] = value
  }

  return runtime
}

export function createServerRuntime(): ServerApi {
  const runtime = {
    ...(BaseServerApi as unknown as Record<string, unknown>),
  } as unknown as ServerApi
  return attachApiExtensionRuntime(runtime)
}

export const Server = attachApiExtensionRuntime(BaseServerApi as unknown as ServerApi)
