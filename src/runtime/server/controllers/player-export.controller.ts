import { Controller } from '../decorators/controller'
import { Export } from '../decorators/export'
import { PlayerDirectoryPort } from '../services/ports/player-directory.port'
import type { CorePlayerExports, SerializedPlayerData } from '../types/core-exports'

/**
 * Exports player directory functionality for RESOURCE mode access.
 *
 * @remarks
 * This controller provides a complete API for remote resources to:
 * - Query player data (by client ID, account ID, or all players)
 * - Check online status and player count
 * - Read/write session metadata
 * - Manage player state flags
 */
@Controller()
export class PlayerExportController implements CorePlayerExports {
  constructor(private playerService: PlayerDirectoryPort) {}

  // ═══════════════════════════════════════════════════════════════
  // Basic Player Queries
  // ═══════════════════════════════════════════════════════════════

  @Export()
  getPlayerId(clientID: number): string | undefined {
    return this.playerService.getPlayerId(clientID)
  }

  @Export()
  getPlayerData(clientID: number): SerializedPlayerData | null {
    const player = this.playerService.getByClient(clientID)
    return player?.serialize() ?? null
  }

  @Export()
  getManyData(clientIds: number[]): SerializedPlayerData[] {
    return this.playerService.getMany(clientIds).map((p) => p.serialize())
  }

  @Export()
  getAllPlayersData(): SerializedPlayerData[] {
    return this.playerService.getAll().map((p) => p.serialize())
  }

  @Export()
  getPlayerByAccountId(accountId: string): SerializedPlayerData | null {
    const players = this.playerService.getAll()
    const player = players.find((p) => p.accountID === accountId)
    return player?.serialize() ?? null
  }

  @Export()
  getPlayerCount(): number {
    return this.playerService.getAll().length
  }

  @Export()
  isPlayerOnline(accountId: string): boolean {
    const players = this.playerService.getAll()
    return players.some((p) => p.accountID === accountId)
  }

  // ═══════════════════════════════════════════════════════════════
  // Metadata Operations
  // ═══════════════════════════════════════════════════════════════

  @Export()
  async getPlayerMeta(clientID: number, key: string): Promise<any> {
    return await this.playerService.getMeta(clientID, key)
  }

  @Export()
  setPlayerMeta(clientID: number, key: string, value: any): void {
    this.playerService.setMeta(clientID, key, value)
  }

  // ═══════════════════════════════════════════════════════════════
  // State Management
  // ═══════════════════════════════════════════════════════════════

  @Export()
  getPlayerStates(clientID: number): string[] {
    const player = this.playerService.getByClient(clientID)
    return player?.getStates() ?? []
  }

  @Export()
  hasPlayerState(clientID: number, state: string): boolean {
    const player = this.playerService.getByClient(clientID)
    return player?.hasState(state) ?? false
  }

  @Export()
  addPlayerState(clientID: number, state: string): void {
    const player = this.playerService.getByClient(clientID)
    player?.addState(state)
  }

  @Export()
  removePlayerState(clientID: number, state: string): void {
    const player = this.playerService.getByClient(clientID)
    player?.removeState(state)
  }
}
