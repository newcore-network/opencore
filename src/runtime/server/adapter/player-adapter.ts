import { PlayerAdapters, Player } from '../entities/player'
import { PlayerSession } from '../types/player-session.types'
import { SerializedPlayerData } from '../types/core-exports.types'

/**
 * Dependencies required to build server-side player instances.
 */
export type PlayerFactoryDeps = PlayerAdapters

/**
 * Adapter hook for creating and hydrating Player instances.
 */
export interface ServerPlayerAdapter {
  createLocal(session: PlayerSession, deps: PlayerFactoryDeps): Player
  createRemote(data: SerializedPlayerData, deps: PlayerFactoryDeps): Player
  serialize?(player: Player): Record<string, unknown> | undefined
  hydrate?(player: Player, payload: Record<string, unknown> | undefined): void
}

/**
 * Restores base state shared by all Player instances.
 */
export function hydrateBasePlayerState(player: Player, data: SerializedPlayerData): Player {
  for (const state of data.states) {
    player.addState(state)
  }

  return player
}

/**
 * Creates the framework default local Player instance.
 */
export function createDefaultLocalPlayer(session: PlayerSession, deps: PlayerFactoryDeps): Player {
  return new Player(session, deps)
}

/**
 * Creates the framework default remote Player instance.
 */
export function createDefaultRemotePlayer(
  data: SerializedPlayerData,
  deps: PlayerFactoryDeps,
): Player {
  const player = new Player(
    {
      clientID: data.clientID,
      accountID: data.accountID,
      identifiers: data.identifiers,
      meta: data.meta,
    },
    deps,
  )

  return hydrateBasePlayerState(player, data)
}
