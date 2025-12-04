import type { LinkedID, PlayerSession } from '../../src/server/services/player.service'
import { Player } from '../../src/server/entities/player'

export interface PlayerConfig {
  clientID: number
  accountID?: string
  rank?: number
  permissions?: string[]
  states?: string[]
  meta?: Record<string, unknown>
}

export class PlayerFactory {
  private static clientIDCounter = 1

  static createPlayer(config?: Partial<PlayerConfig>): Player {
    const clientID = config?.clientID ?? this.clientIDCounter++
    const accountID: LinkedID | undefined = config?.accountID

    const session: PlayerSession = {
      clientID,
      accountID,
      meta: config?.meta ?? {},
    }

    const player = new Player(session)

    if (config?.states) {
      for (const state of config.states) {
        player.addState(state)
      }
    }

    return player
  }

  static createPlayers(count: number, baseConfig?: Partial<PlayerConfig>): Player[] {
    const players: Player[] = []

    for (let i = 0; i < count; i++) {
      const config: Partial<PlayerConfig> = {
        ...baseConfig,
        clientID: baseConfig?.clientID ?? this.clientIDCounter++,
        accountID: baseConfig?.accountID ?? `account-${i}`,
        rank: baseConfig?.rank ?? Math.floor(Math.random() * 10),
        permissions: baseConfig?.permissions ?? [],
      }

      players.push(this.createPlayer(config))
    }

    return players
  }

  static createPlayersWithRanks(
    count: number,
    rankDistribution: { rank: number; count: number }[],
  ): Player[] {
    const players: Player[] = []
    let playerIndex = 0

    for (const { rank, count: rankCount } of rankDistribution) {
      for (let i = 0; i < rankCount && playerIndex < count; i++) {
        players.push(
          this.createPlayer({
            clientID: this.clientIDCounter++,
            accountID: `account-${playerIndex}`,
            rank,
            permissions: [],
          }),
        )
        playerIndex++
      }
    }

    while (playerIndex < count) {
      players.push(
        this.createPlayer({
          clientID: this.clientIDCounter++,
          accountID: `account-${playerIndex}`,
          rank: 0,
          permissions: [],
        }),
      )
      playerIndex++
    }

    return players
  }

  static createPlayersWithPermissions(count: number, permissionSets: string[][]): Player[] {
    const players: Player[] = []

    for (let i = 0; i < count; i++) {
      const permissions = permissionSets[i % permissionSets.length] ?? []
      players.push(
        this.createPlayer({
          clientID: this.clientIDCounter++,
          accountID: `account-${i}`,
          permissions,
        }),
      )
    }

    return players
  }

  static reset(): void {
    this.clientIDCounter = 1
  }

  /**
   * Crea jugadores con diferentes configuraciones de rank y permissions
   */
  static createPlayersWithConfig(
    count: number,
    configs: Array<{ rank?: number; permissions?: string[] }>,
  ): Player[] {
    const players: Player[] = []

    for (let i = 0; i < count; i++) {
      const config = configs[i % configs.length] ?? {}
      players.push(
        this.createPlayer({
          clientID: this.clientIDCounter++,
          accountID: `account-${i}`,
          rank: config.rank ?? 0,
          permissions: config.permissions ?? [],
        }),
      )
    }

    return players
  }

  /**
   * Simula el ciclo de vida completo de un jugador
   */
  static async simulatePlayerLifecycle(
    player: Player,
    lifecycleSteps: {
      onJoin?: (player: Player) => void | Promise<void>
      onAuthenticate?: (player: Player) => void | Promise<void>
      onDisconnect?: (player: Player) => void | Promise<void>
    },
  ): Promise<number> {
    const start = performance.now()

    // Simular playerJoining
    if (lifecycleSteps.onJoin) {
      await lifecycleSteps.onJoin(player)
    }

    // Simular autenticación
    if (lifecycleSteps.onAuthenticate) {
      await lifecycleSteps.onAuthenticate(player)
    }

    // Simular playerDropped
    if (lifecycleSteps.onDisconnect) {
      await lifecycleSteps.onDisconnect(player)
    }

    const end = performance.now()
    return end - start
  }
}
