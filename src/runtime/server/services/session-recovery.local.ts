import { injectable } from 'tsyringe'
import { IPlayerServer } from '../../../adapters/contracts/server/IPlayerServer'
import { loggers } from '../../../kernel/logger'
import { emitFrameworkEvent } from '../bus/internal-event.bus'
import { Players } from '../ports/players.api-port'
import { PlayerSessionLifecyclePort } from '../ports/internal/player-session-lifecycle.port'

/**
 * Service responsible for recovering player sessions after resource restarts.
 *
 * @remarks
 * When a resource restarts (e.g., during development hot-reload), player sessions
 * are lost because the PlayerService map is cleared. However, players remain connected
 * to FiveM. This service detects these orphaned players and recreates their sessions.
 *
 * **Recovery Flow:**
 * 1. Query FiveM for all connected player sources via `getPlayers()`
 * 2. For each connected player, check if a session exists in PlayerService
 * 3. If no session exists, create one with basic identifiers (license, steam, discord)
 * 4. Emit `internal:playerSessionRecovered` event for each recovered session
 *
 * **Limitations:**
 * - Only basic session data is recovered (clientID, identifiers)
 * - `accountID` is NOT recovered - players must re-authenticate
 * - Session metadata and states are NOT recovered
 */
@injectable()
export class SessionRecoveryService {
  constructor(
    private readonly playerServer: IPlayerServer,
    private readonly playerDirectory: Players,
    private readonly playerSessionLifecycle: PlayerSessionLifecyclePort,
  ) {}

  /**
   * Scans for connected players and recovers sessions for any without an active session.
   *
   * @returns Object containing recovery statistics
   */
  recoverSessions(): { total: number; recovered: number; existing: number } {
    const connectedPlayers = this.playerServer.getConnectedPlayers()
    const stats = { total: connectedPlayers.length, recovered: 0, existing: 0 }

    if (connectedPlayers.length === 0) {
      loggers.session.debug('[SessionRecovery] No connected players found')
      return stats
    }

    loggers.session.info(
      `[SessionRecovery] Found ${connectedPlayers.length} connected player(s), checking sessions...`,
    )

    for (const playerSrc of connectedPlayers) {
      const clientId = Number(playerSrc)

      if (Number.isNaN(clientId) || clientId <= 0) {
        loggers.session.warn(`[SessionRecovery] Invalid player source: ${playerSrc}`)
        continue
      }

      const existingPlayer = this.playerDirectory.getByClient(clientId)
      if (existingPlayer) {
        stats.existing++
        continue
      }

      this.recoverPlayerSession(clientId)
      stats.recovered++
    }

    if (stats.recovered > 0) {
      loggers.session.info(
        `[SessionRecovery] Recovery complete: ${stats.recovered} recovered, ${stats.existing} already existed`,
      )
    } else {
      loggers.session.debug(`[SessionRecovery] All ${stats.existing} sessions already exist`)
    }

    return stats
  }

  private recoverPlayerSession(clientId: number): void {
    const clientIdStr = clientId.toString()

    const license = this.playerServer.getIdentifier(clientIdStr, 'license')
    const steam = this.playerServer.getIdentifier(clientIdStr, 'steam')
    const discord = this.playerServer.getIdentifier(clientIdStr, 'discord')
    const playerName = this.playerServer.getName(clientIdStr)

    const player = this.playerSessionLifecycle.bind(clientId, {
      license,
      steam,
      discord,
    })

    loggers.session.info(`[SessionRecovery] Recovered session for player`, {
      clientId,
      name: playerName,
      license: license ? `${license.substring(0, 20)}...` : 'none',
    })

    emitFrameworkEvent('internal:playerSessionRecovered', {
      clientId,
      player,
      license,
    })
  }
}
