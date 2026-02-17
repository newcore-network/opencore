import * as BaseClientApi from './api'
import type { ClientPluginApi } from './library/plugin/client-plugin-api'

const RESERVED_CLIENT_API_KEYS = new Set(['registerApiExtension', '__proto__', 'prototype', 'constructor'])

export type ClientApi = typeof BaseClientApi &
  ClientPluginApi & {
    registerApiExtension(key: string, value: unknown): void
  }

function assertExtensionKey(key: string): void {
  if (!key || key.trim().length === 0) {
    throw new Error('Client API extension key must be a non-empty string')
  }

  if (RESERVED_CLIENT_API_KEYS.has(key)) {
    throw new Error(`Client API extension key "${key}" is reserved`)
  }
}

function attachApiExtensionRuntime(runtime: ClientApi): ClientApi {
  const dynamicApi: Record<string, unknown> = {}

  runtime.registerApiExtension = (key: string, value: unknown) => {
    assertExtensionKey(key)

    if (Object.hasOwn(dynamicApi, key) || key in runtime) {
      throw new Error(`Client API "${key}" already registered`)
    }

    dynamicApi[key] = value
    ;(runtime as unknown as Record<string, unknown>)[key] = value
  }

  return runtime
}

export function createClientRuntime(): ClientApi {
  const runtime = {
    ...(BaseClientApi as unknown as Record<string, unknown>),
  } as unknown as ClientApi

  return attachApiExtensionRuntime(runtime)
}

export const Client = attachApiExtensionRuntime(BaseClientApi as unknown as ClientApi)
