import { di } from '../client-container'
import { createNodeClientAdapter } from './node-client-adapter'
import { type OpenCoreClientAdapter, type ClientAdapterContext, bindClientTransportInstances } from './client-adapter'
import { IClientRuntimeBridge } from './runtime-bridge'

let activeClientAdapterName: string | null = null

function assertTokenAvailable(token: any, adapterName: string): void {
  if (di.isRegistered(token)) {
    throw new Error(`[OpenCore] Adapter '${adapterName}' cannot bind an already registered token.`)
  }
}

function createAdapterContext(adapterName: string): ClientAdapterContext {
  return {
    adapterName,
    container: di,
    isRegistered(token: any): boolean {
      return di.isRegistered(token)
    },
    bindSingleton(token: any, implementation: any): void {
      assertTokenAvailable(token, adapterName)
      di.registerSingleton(token, implementation)
    },
    bindInstance(token: any, value: any): void {
      assertTokenAvailable(token, adapterName)
      di.registerInstance(token, value)
    },
    bindFactory(token: any, factory: () => any): void {
      assertTokenAvailable(token, adapterName)
      di.register(token, { useFactory: factory })
    },
    bindMessagingTransport(transport) {
      bindClientTransportInstances(this, transport)
    },
    useRuntimeBridge(runtime: IClientRuntimeBridge): void {
      this.bindInstance(IClientRuntimeBridge as any, runtime)
    },
  }
}

/**
 * Installs the active client adapter for the current bootstrap.
 */
export async function installClientAdapter(adapter?: OpenCoreClientAdapter): Promise<void> {
  const active = adapter ?? createNodeClientAdapter()
  activeClientAdapterName = active.name
  await active.register(createAdapterContext(active.name))
}

export function getActiveClientAdapterName(): string | undefined {
  return activeClientAdapterName ?? undefined
}

export function getCurrentClientResourceName(): string {
  if (di.isRegistered(IClientRuntimeBridge as any)) {
    return di.resolve(IClientRuntimeBridge as any).getCurrentResourceName()
  }

  const fn = (globalThis as any).GetCurrentResourceName
  if (typeof fn === 'function') {
    const name = fn()
    if (typeof name === 'string' && name.trim()) return name
  }

  return 'default'
}

export function __resetClientAdapterRegistryForTests(): void {
  activeClientAdapterName = null
}
