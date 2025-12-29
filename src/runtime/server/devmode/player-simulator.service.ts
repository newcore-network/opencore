import { injectable } from 'tsyringe'
import { INetTransport } from '../../../adapters/contracts/INetTransport'
import { di } from '../../../kernel/di/container'
import { loggers } from '../../../kernel/shared/logger'
import { PlayerSessionLifecyclePort } from '../services/ports/player-session-lifecycle.port'
import type { SimulatedPlayer, SimulatedPlayerOptions } from './types'

/**
 * Service for simulating player connections during development.
 *
 * Allows developers to test their code without needing actual FiveM clients.
 * Simulated players can emit events and execute commands.
 */
@injectable()
export class PlayerSimulatorService {
  private simulatedPlayers = new Map<number, SimulatedPlayerData>()
  private clientIdCounter = 90000 // Start high to avoid conflicts with real players

  constructor() {}

  private get transport(): INetTransport {
    return di.resolve(INetTransport as any)
  }

  private get sessionLifecycle(): PlayerSessionLifecyclePort {
    return di.resolve(PlayerSessionLifecyclePort as any)
  }

  /**
   * Connects a simulated player.
   * @param options - Player configuration
   * @returns Simulated player instance
   */
  connect(options?: Partial<SimulatedPlayerOptions>): SimulatedPlayer {
    const clientId = options?.clientId ?? this.clientIdCounter++
    const name = options?.name ?? `SimPlayer_${clientId}`
    const accountId = options?.accountId ?? `sim_account_${clientId}`

    // Create the simulated player data
    const playerData: SimulatedPlayerData = {
      clientId,
      name,
      accountId,
      rank: options?.rank ?? 0,
      permissions: options?.permissions ?? [],
      states: options?.states ?? [],
      metadata: options?.metadata ?? {},
      connected: true,
      networkLatency: 0,
    }

    this.simulatedPlayers.set(clientId, playerData)

    // Bind player session via lifecycle port
    try {
      this.sessionLifecycle.bind(clientId, {
        license: `sim_${accountId}`,
        discord: `sim_${clientId}`,
      })
    } catch (error) {
      loggers.bootstrap.warn('[DevMode] Could not bind player session', {
        clientId,
        error: (error as Error).message,
      })
    }

    loggers.bootstrap.info(`[DevMode] Simulated player connected: ${name} (${clientId})`)

    // Return the simulated player interface
    return this.createSimulatedPlayerInterface(playerData)
  }

  /**
   * Disconnects a simulated player.
   * @param clientId - Client ID to disconnect
   */
  disconnect(clientId: number): void {
    const player = this.simulatedPlayers.get(clientId)
    if (!player) return

    player.connected = false

    // Unbind player session
    try {
      this.sessionLifecycle.unbind(clientId)
    } catch (error) {
      loggers.bootstrap.warn('[DevMode] Could not unbind player session', {
        clientId,
        error: (error as Error).message,
      })
    }

    this.simulatedPlayers.delete(clientId)
    loggers.bootstrap.info(`[DevMode] Simulated player disconnected: ${player.name} (${clientId})`)
  }

  /**
   * Connects multiple simulated players.
   * @param count - Number of players to connect
   * @param baseOptions - Base options for all players
   * @returns Array of simulated players
   */
  connectMany(count: number, baseOptions?: Partial<SimulatedPlayerOptions>): SimulatedPlayer[] {
    const players: SimulatedPlayer[] = []
    for (let i = 0; i < count; i++) {
      players.push(
        this.connect({
          ...baseOptions,
          name: baseOptions?.name ? `${baseOptions.name}_${i}` : undefined,
        }),
      )
    }
    return players
  }

  /**
   * Disconnects all simulated players.
   */
  disconnectAll(): void {
    for (const clientId of this.simulatedPlayers.keys()) {
      this.disconnect(clientId)
    }
  }

  /**
   * Gets all simulated players.
   */
  getAll(): SimulatedPlayer[] {
    return Array.from(this.simulatedPlayers.values())
      .filter((p) => p.connected)
      .map((p) => this.createSimulatedPlayerInterface(p))
  }

  /**
   * Gets a simulated player by client ID.
   */
  get(clientId: number): SimulatedPlayer | null {
    const player = this.simulatedPlayers.get(clientId)
    if (!player || !player.connected) return null
    return this.createSimulatedPlayerInterface(player)
  }

  /**
   * Sets network latency for a simulated player.
   * @param clientId - Client ID
   * @param latency - Latency in milliseconds
   */
  setNetworkLatency(clientId: number, latency: number): void {
    const player = this.simulatedPlayers.get(clientId)
    if (player) {
      player.networkLatency = latency
    }
  }

  /**
   * Simulates a net event from a player.
   * @param clientId - Client ID
   * @param eventName - Event name
   * @param args - Event arguments
   */
  async emitAsPlayer(clientId: number, eventName: string, ...args: unknown[]): Promise<void> {
    const player = this.simulatedPlayers.get(clientId)
    if (!player || !player.connected) {
      throw new Error(`Simulated player ${clientId} not found or disconnected`)
    }

    // Add artificial latency if configured
    if (player.networkLatency > 0) {
      await this.delay(player.networkLatency)
    }

    // Use the node transport to simulate the event
    const nodeTransport = this.transport as any
    if (typeof nodeTransport.simulateClientEvent === 'function') {
      nodeTransport.simulateClientEvent(eventName, clientId, ...args)
    } else {
      loggers.bootstrap.warn('[DevMode] Transport does not support event simulation')
    }
  }

  /**
   * Gets statistics about simulated players.
   */
  getStatistics(): {
    total: number
    connected: number
    avgLatency: number
  } {
    const players = Array.from(this.simulatedPlayers.values())
    const connected = players.filter((p) => p.connected)
    const avgLatency =
      connected.length > 0
        ? connected.reduce((sum, p) => sum + p.networkLatency, 0) / connected.length
        : 0

    return {
      total: players.length,
      connected: connected.length,
      avgLatency,
    }
  }

  private createSimulatedPlayerInterface(data: SimulatedPlayerData): SimulatedPlayer {
    return {
      clientId: data.clientId,
      connected: data.connected,
      networkLatency: data.networkLatency,
      emit: (eventName: string, ...args: unknown[]) => {
        void this.emitAsPlayer(data.clientId, eventName, ...args)
      },
      disconnect: () => {
        this.disconnect(data.clientId)
      },
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Internal data structure for simulated players.
 */
interface SimulatedPlayerData {
  clientId: number
  name: string
  accountId: string
  rank: number
  permissions: string[]
  states: string[]
  metadata: Record<string, unknown>
  connected: boolean
  networkLatency: number
}
