import type { OpenCoreClientAdapter } from './client/adapter'
import type { OpenCoreServerAdapter } from './server/adapter'

declare global {
  var __OPENCORE_PROJECT_SERVER_ADAPTER__: OpenCoreServerAdapter | undefined
  var __OPENCORE_PROJECT_CLIENT_ADAPTER__: OpenCoreClientAdapter | undefined
}

export function getInjectedServerAdapter(): OpenCoreServerAdapter | undefined {
  return globalThis.__OPENCORE_PROJECT_SERVER_ADAPTER__
}

export function getInjectedClientAdapter(): OpenCoreClientAdapter | undefined {
  return globalThis.__OPENCORE_PROJECT_CLIENT_ADAPTER__
}

export function __resetInjectedProjectAdaptersForTests(): void {
  delete globalThis.__OPENCORE_PROJECT_SERVER_ADAPTER__
  delete globalThis.__OPENCORE_PROJECT_CLIENT_ADAPTER__
}
