import { inject } from 'tsyringe'
import { loggers } from '../../../kernel/logger'
import { Controller } from '../decorators/controller'
import { Export } from '../decorators/export'
import { serializeServerPlayerData } from '../adapter/serialization'
import { Players } from '../ports/players.api-port'
import { InternalPlayerExports, SerializedPlayerData } from '../types/core-exports.types'
import { LinkedID } from '../services'

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
export class PlayerExportController implements InternalPlayerExports {
  constructor(@inject(Players as any) private playerService: Players) {}

  // ═══════════════════════════════════════════════════════════════
  // Basic Player Queries
  // ═══════════════════════════════════════════════════════════════

  @Export()
  getPlayerId(clientID: number): LinkedID | undefined {
    return this.playerService.getAccountLinked(clientID)
  }

  @Export()
  getPlayerData(clientID: number): SerializedPlayerData | null {
    const player = this.playerService.getByClient(clientID)
    return player ? serializeServerPlayerData(player) : null
  }

  @Export()
  getManyData(clientIds: number[]): SerializedPlayerData[] {
    return this.playerService.getMany(clientIds).map((player) => serializeServerPlayerData(player))
  }

  @Export()
  getAllPlayersData(): SerializedPlayerData[] {
    return this.playerService.getAll().map((player) => serializeServerPlayerData(player))
  }

  @Export()
  getPlayerByAccountId(accountId: string): SerializedPlayerData | null {
    const players = this.playerService.getAll()
    const player = players.find((p) => p.accountID === accountId)
    return player ? serializeServerPlayerData(player) : null
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

  @Export()
  linkPlayerAccount(clientID: number, accountID: string): void {
    const player = this.playerService.getByClient(clientID)
    if (!player) return

    player.linkAccount(accountID)
    loggers.session.debug('Remote player account linked in CORE', {
      clientID,
      accountID,
    })
  }

  @Export()
  unlinkPlayerAccount(clientID: number): void {
    const player = this.playerService.getByClient(clientID)
    if (!player) return

    const previousAccountID = player.accountID
    player.unlinkAccount()
    loggers.session.debug('Remote player account unlinked in CORE', {
      clientID,
      accountID: previousAccountID,
    })
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
