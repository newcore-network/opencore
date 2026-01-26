import { injectable } from 'tsyringe'
import { GLOBAL_CONTAINER } from '../../../kernel/di/container'
import { getRuntimeContext } from '../runtime'
import { Players } from '../ports/player-directory'
import {
  type DIRegistration,
  type HandlerInfo,
  IDevModeInspector,
} from './contracts/IDevModeInspector'
import { RuntimeSnapshot } from './types'

/**
 * Implementation of the DevMode state inspector.
 *
 * Provides runtime introspection capabilities for debugging
 * and monitoring during development.
 */
@injectable()
export class StateInspectorService extends IDevModeInspector {
  private commandHandlers = new Map<string, HandlerInfo>()
  private netEventHandlers = new Map<string, HandlerInfo>()
  private exportHandlers = new Map<string, HandlerInfo>()
  private fiveMEventHandlers = new Map<string, HandlerInfo>()

  private get players(): Players {
    return GLOBAL_CONTAINER.resolve(Players as any)
  }

  captureSnapshot(): RuntimeSnapshot {
    const ctx = getRuntimeContext()
    const allPlayers = this.players.getAll()

    return {
      timestamp: Date.now(),
      mode: ctx.mode,
      features: Object.fromEntries(
        Object.entries(ctx.features).map(([key, value]) => [key, value.enabled]),
      ),
      players: {
        count: allPlayers.length,
        ids: allPlayers.map((p) => p.clientID),
      },
      handlers: {
        commands: Array.from(this.commandHandlers.keys()),
        netEvents: Array.from(this.netEventHandlers.keys()),
        exports: Array.from(this.exportHandlers.keys()),
        fiveMEvents: Array.from(this.fiveMEventHandlers.keys()),
      },
      diContainer: this.getDIContainerInfo(),
    }
  }

  getRegisteredHandlers(): Map<string, HandlerInfo[]> {
    const result = new Map<string, HandlerInfo[]>()
    result.set('commands', Array.from(this.commandHandlers.values()))
    result.set('netEvents', Array.from(this.netEventHandlers.values()))
    result.set('exports', Array.from(this.exportHandlers.values()))
    result.set('fiveMEvents', Array.from(this.fiveMEventHandlers.values()))
    return result
  }

  getDIGraph(): DIRegistration[] {
    const registrations: DIRegistration[] = []

    // Get registrations from the DI container
    // Note: This is a simplified implementation
    // The actual implementation depends on tsyringe internals
    try {
      const container = GLOBAL_CONTAINER as any
      if (container._registry) {
        for (const [token, registration] of container._registry) {
          const tokenName = typeof token === 'function' ? token.name : String(token)
          registrations.push({
            token: tokenName,
            implementation: registration?.provider?.useClass?.name ?? 'unknown',
            lifecycle: registration?.options?.lifecycle === 0 ? 'transient' : 'singleton',
          })
        }
      }
    } catch {
      // Fallback if we can't access internals
    }

    return registrations
  }

  getPlayerStates(): Map<number, string[]> {
    const states = new Map<number, string[]>()
    const allPlayers = this.players.getAll()

    for (const player of allPlayers) {
      states.set(player.clientID, player.getStates())
    }

    return states
  }

  getHandlerInfo(type: string, name: string): HandlerInfo | null {
    switch (type) {
      case 'command':
        return this.commandHandlers.get(name) ?? null
      case 'netEvent':
        return this.netEventHandlers.get(name) ?? null
      case 'export':
        return this.exportHandlers.get(name) ?? null
      case 'fiveMEvent':
        return this.fiveMEventHandlers.get(name) ?? null
      default:
        return null
    }
  }

  /**
   * Registers a command handler for tracking.
   */
  registerCommandHandler(name: string, info: HandlerInfo): void {
    this.commandHandlers.set(name, info)
  }

  /**
   * Registers a net event handler for tracking.
   */
  registerNetEventHandler(name: string, info: HandlerInfo): void {
    this.netEventHandlers.set(name, info)
  }

  /**
   * Registers an export handler for tracking.
   */
  registerExportHandler(name: string, info: HandlerInfo): void {
    this.exportHandlers.set(name, info)
  }

  /**
   * Registers a FiveM event handler for tracking.
   */
  registerFiveMEventHandler(name: string, info: HandlerInfo): void {
    this.fiveMEventHandlers.set(name, info)
  }

  /**
   * Gets all commands with their metadata.
   */
  getAllCommands(): Array<{ name: string; info: HandlerInfo }> {
    return Array.from(this.commandHandlers.entries()).map(([name, info]) => ({
      name,
      info,
    }))
  }

  /**
   * Gets detailed player information for debugging.
   */
  getPlayerDetails(clientId: number): Record<string, unknown> | null {
    const player = this.players.getByClient(clientId)
    if (!player) return null

    return {
      clientId: player.clientID,
      accountId: player.accountID,
      name: player.name,
      states: player.getStates(),
      position: player.getPosition(),
    }
  }

  /**
   * Gets a summary of the current runtime state.
   */
  getSummary(): {
    mode: string
    playerCount: number
    handlerCounts: Record<string, number>
    uptime: number
  } {
    const ctx = getRuntimeContext()
    return {
      mode: ctx.mode,
      playerCount: this.players.getAll().length,
      handlerCounts: {
        commands: this.commandHandlers.size,
        netEvents: this.netEventHandlers.size,
        exports: this.exportHandlers.size,
        fiveMEvents: this.fiveMEventHandlers.size,
      },
      uptime: process.uptime ? process.uptime() * 1000 : 0,
    }
  }

  private getDIContainerInfo(): { registrations: number; singletons: string[] } {
    const registrations = this.getDIGraph()
    return {
      registrations: registrations.length,
      singletons: registrations.filter((r) => r.lifecycle === 'singleton').map((r) => r.token),
    }
  }
}
