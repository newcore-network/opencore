import type { Player } from '../entities/player'
import type { SerializedPlayerData } from '../types/core-exports.types'
import { serializeServerPlayerAdapterPayload } from './registry'

/**
 * Serializes a Player using the active server adapter payload hooks.
 */
export function serializeServerPlayerData(player: Player): SerializedPlayerData {
  const base = player.serialize()
  const adapter = serializeServerPlayerAdapterPayload(player)

  return adapter ? { ...base, adapter } : base
}
