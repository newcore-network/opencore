import { DependencyContainer } from 'tsyringe'
import { GLOBAL_CONTAINER } from '../../../kernel/di/container'
import { Player } from '../entities/player'
import { SerializedPlayerData } from '../types/core-exports.types'
import { PlayerSession } from '../types/player-session.types'
import {
  createDefaultLocalPlayer,
  createDefaultRemotePlayer,
  type PlayerFactoryDeps,
  type ServerPlayerAdapter,
} from './player-adapter'
import {
  bindTransportInstances,
  type OpenCoreServerAdapter,
  type ServerAdapterContext,
} from './server-adapter'

const DEFAULT_PLAYER_ADAPTER: ServerPlayerAdapter = {
  createLocal: createDefaultLocalPlayer,
  createRemote: createDefaultRemotePlayer,
}

interface ActiveServerAdapterState {
  name: string
  playerAdapter: ServerPlayerAdapter
}

let activeServerAdapter: ActiveServerAdapterState | null = null

function assertTokenAvailable(
  container: DependencyContainer,
  token: any,
  adapterName: string,
): void {
  if (container.isRegistered(token)) {
    throw new Error(`[OpenCore] Adapter '${adapterName}' cannot bind an already registered token.`)
  }
}

function createAdapterContext(adapterName: string): ServerAdapterContext {
  let playerAdapterConfigured = false

  return {
    adapterName,
    container: GLOBAL_CONTAINER,
    isRegistered(token: any): boolean {
      return GLOBAL_CONTAINER.isRegistered(token)
    },
    bindSingleton(token: any, implementation: any): void {
      assertTokenAvailable(GLOBAL_CONTAINER, token, adapterName)
      GLOBAL_CONTAINER.registerSingleton(token, implementation)
    },
    bindInstance(token: any, value: any): void {
      assertTokenAvailable(GLOBAL_CONTAINER, token, adapterName)
      GLOBAL_CONTAINER.registerInstance(token, value)
    },
    bindFactory(token: any, factory: () => any): void {
      assertTokenAvailable(GLOBAL_CONTAINER, token, adapterName)
      GLOBAL_CONTAINER.register(token, { useFactory: factory })
    },
    bindMessagingTransport(transport) {
      bindTransportInstances(this, transport)
    },
    usePlayerAdapter(adapter: ServerPlayerAdapter): void {
      if (playerAdapterConfigured) {
        throw new Error(`[OpenCore] Adapter '${adapterName}' already configured a Player adapter.`)
      }
      activeServerAdapter = {
        name: adapterName,
        playerAdapter: adapter,
      }
      playerAdapterConfigured = true
    },
  }
}

/**
 * Installs the active server adapter for the current bootstrap.
 */
export async function installServerAdapter(adapter: OpenCoreServerAdapter): Promise<void> {
  activeServerAdapter = {
    name: adapter.name,
    playerAdapter: DEFAULT_PLAYER_ADAPTER,
  }

  const context = createAdapterContext(adapter.name)
  await adapter.register(context)
}

/**
 * Returns the currently active server adapter name.
 */
export function getActiveServerAdapterName(): string | undefined {
  return activeServerAdapter?.name
}

/**
 * Builds a local Player through the active adapter.
 */
export function createLocalServerPlayer(session: PlayerSession, deps: PlayerFactoryDeps): Player {
  return (activeServerAdapter?.playerAdapter ?? DEFAULT_PLAYER_ADAPTER).createLocal(session, deps)
}

/**
 * Builds a remote Player through the active adapter.
 */
export function createRemoteServerPlayer(
  data: SerializedPlayerData,
  deps: PlayerFactoryDeps,
): Player {
  if (
    data.adapter?.name &&
    activeServerAdapter?.name &&
    data.adapter.name !== activeServerAdapter.name
  ) {
    throw new Error(
      `[OpenCore] Cannot hydrate Player for adapter '${data.adapter.name}' with active adapter '${activeServerAdapter.name}'.`,
    )
  }

  const playerAdapter = activeServerAdapter?.playerAdapter ?? DEFAULT_PLAYER_ADAPTER
  const player = playerAdapter.createRemote(data, deps)
  playerAdapter.hydrate?.(player, data.adapter?.payload)
  return player
}

/**
 * Serializes adapter-specific player payload.
 */
export function serializeServerPlayerAdapterPayload(
  player: Player,
): SerializedPlayerData['adapter'] | undefined {
  const payload = activeServerAdapter?.playerAdapter.serialize?.(player)
  if (!activeServerAdapter || payload === undefined) {
    return undefined
  }

  return {
    name: activeServerAdapter.name,
    payload,
  }
}

export function __resetServerAdapterRegistryForTests(): void {
  activeServerAdapter = null
}
