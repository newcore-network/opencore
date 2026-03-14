import type { InjectionToken } from 'tsyringe'
import { di } from '../client-container'
import {
  type OpenCoreClientAdapter,
  type ClientAdapterContext,
  bindClientTransportInstances,
} from './client-adapter'
import { IClientRuntimeBridge } from './runtime-bridge'

declare const __OPENCORE_TARGET__: 'client' | 'server' | undefined

let activeClientAdapterName: string | null = null

async function getDefaultClientAdapter(): Promise<OpenCoreClientAdapter> {
  if (typeof __OPENCORE_TARGET__ !== 'undefined' && __OPENCORE_TARGET__ === 'client') {
    throw new Error(
      '[OpenCore] No client adapter provided. Configure one in opencore.config.ts or pass adapter to Client.init().',
    )
  }

  const loadNodeClientAdapterModule = Function(
    'return import("./node-client-adapter")',
  ) as () => Promise<typeof import('./node-client-adapter')>

  const { createNodeClientAdapter } = await loadNodeClientAdapterModule()
  return createNodeClientAdapter()
}

function assertTokenAvailable<T>(token: InjectionToken<T>, adapterName: string): void {
  if (di.isRegistered(token)) {
    throw new Error(`[OpenCore] Adapter '${adapterName}' cannot bind an already registered token.`)
  }
}

function createAdapterContext(adapterName: string): ClientAdapterContext {
  return {
    adapterName,
    container: di,
    isRegistered<T>(token: InjectionToken<T>): boolean {
      return di.isRegistered(token)
    },
    bindSingleton<T>(token: InjectionToken<T>, implementation: InjectionToken<T>): void {
      assertTokenAvailable(token, adapterName)
      di.registerSingleton(token, implementation)
    },
    bindInstance<T>(token: InjectionToken<T>, value: T): void {
      assertTokenAvailable(token, adapterName)
      di.registerInstance(token, value)
    },
    bindFactory<T>(token: InjectionToken<T>, factory: () => T): void {
      assertTokenAvailable(token, adapterName)
      di.register(token, { useFactory: factory })
    },
    bindMessagingTransport(transport) {
      bindClientTransportInstances(this, transport)
    },
    useRuntimeBridge(runtime: IClientRuntimeBridge): void {
      this.bindInstance(IClientRuntimeBridge as InjectionToken<IClientRuntimeBridge>, runtime)
    },
  }
}

/**
 * Installs the active client adapter for the current bootstrap.
 */
export async function installClientAdapter(adapter?: OpenCoreClientAdapter): Promise<void> {
  const active = adapter ?? (await getDefaultClientAdapter())
  if (activeClientAdapterName) {
    if (activeClientAdapterName !== active.name) {
      throw new Error(
        `[OpenCore] Client adapter '${active.name}' cannot be installed because '${activeClientAdapterName}' is already active.`,
      )
    }

    return
  }

  await active.register(createAdapterContext(active.name))
  activeClientAdapterName = active.name
}

export function getActiveClientAdapterName(): string | undefined {
  return activeClientAdapterName ?? undefined
}

export function assertClientAdapterCompatibility(adapter?: OpenCoreClientAdapter): void {
  if (!adapter || !activeClientAdapterName) {
    return
  }

  if (adapter.name !== activeClientAdapterName) {
    throw new Error(
      `[OpenCore] Client adapter '${adapter.name}' does not match active adapter '${activeClientAdapterName}'.`,
    )
  }
}

export function getCurrentClientResourceName(): string {
  if (di.isRegistered(IClientRuntimeBridge as InjectionToken<IClientRuntimeBridge>)) {
    return di
      .resolve(IClientRuntimeBridge as InjectionToken<IClientRuntimeBridge>)
      .getCurrentResourceName()
  }

  const fn = (globalThis as Record<string, unknown>).GetCurrentResourceName
  if (typeof fn === 'function') {
    const name = fn()
    if (typeof name === 'string' && name.trim()) return name
  }

  return 'default'
}

export function __resetClientAdapterRegistryForTests(): void {
  activeClientAdapterName = null
}
