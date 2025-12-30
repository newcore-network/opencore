import { injectable } from 'tsyringe'
import { di } from '../../../kernel/di/container'
import { loggers } from '../../../kernel/shared/logger'
import {
  createDevTransport,
  detectEnvironment,
  isWebSocketTransport,
  startDevTransport,
  stopDevTransport,
} from '../../../kernel/shared/logger/transports/dev-transport.factory'
import { LogTransport } from '../../../kernel/shared/logger/transports/transport.interface'
import { EventInterceptorService } from './event-interceptor.service'
import { HotReloadServer } from './hot-reload.server'
import { PlayerSimulatorService } from './player-simulator.service'
import { StateInspectorService } from './state-inspector.service'
import { BridgeMessage, DevEvent, DevModeOptions, RuntimeSnapshot } from './types'

// Safe wrapper for FiveM ExecuteCommand (no-op in Node.js)
function safeExecuteCommand(command: string): void {
  if (typeof ExecuteCommand === 'function') {
    ExecuteCommand(command)
  } else {
    loggers.bootstrap.warn('[DevMode] ExecuteCommand not available (not running in FiveM)')
  }
}

/**
 * Main DevMode service that orchestrates all development tools.
 *
 * Provides a unified interface for:
 * - Hot reload server for automatic resource restarting
 * - Event interception and recording
 * - Runtime state inspection
 * - Player simulation
 * - Log streaming to external tools
 */
@injectable()
export class DevModeService {
  private enabled = false
  private options: DevModeOptions | null = null
  private hotReloadServer: HotReloadServer | null = null
  private logTransport: LogTransport | null = null

  private get interceptor(): EventInterceptorService {
    return di.resolve(EventInterceptorService)
  }

  private get inspector(): StateInspectorService {
    return di.resolve(StateInspectorService)
  }

  private get simulator(): PlayerSimulatorService {
    return di.resolve(PlayerSimulatorService)
  }

  /**
   * Enables DevMode with the specified options.
   * @param options - DevMode configuration
   */
  async enable(options: DevModeOptions): Promise<void> {
    if (this.enabled) {
      loggers.bootstrap.warn('[DevMode] Already enabled, skipping')
      return
    }

    this.options = options
    this.enabled = true

    loggers.bootstrap.info('[DevMode] Enabling development mode...', {
      hotReload: options.hotReload?.enabled,
      bridge: options.bridge?.autoConnect,
      interceptor: options.interceptor?.enabled,
      simulator: options.simulator?.enabled,
    })

    // Start hot reload server
    if (options.hotReload?.enabled) {
      this.hotReloadServer = new HotReloadServer(options.hotReload)
      this.hotReloadServer.start()
    }

    // Configure event interceptor
    if (options.interceptor) {
      this.interceptor.configure(options.interceptor)
    }

    // Connect to CLI bridge
    if (options.bridge?.autoConnect) {
      await this.connectToBridge(options.bridge.url)
    }

    // Auto-connect simulated players
    if (options.simulator?.enabled && options.simulator.autoConnectPlayers > 0) {
      this.simulator.connectMany(options.simulator.autoConnectPlayers)
    }

    loggers.bootstrap.info('[DevMode] Development mode enabled successfully')
  }

  /**
   * Disables DevMode and cleans up resources.
   */
  disable(): void {
    if (!this.enabled) return

    loggers.bootstrap.info('[DevMode] Disabling development mode...')

    // Stop hot reload server
    if (this.hotReloadServer) {
      this.hotReloadServer.stop()
      this.hotReloadServer = null
    }

    // Disconnect log transport
    if (this.logTransport) {
      void stopDevTransport(this.logTransport)
      this.logTransport = null
    }

    // Disconnect all simulated players
    this.simulator.disconnectAll()

    // Clear event history
    this.interceptor.clearHistory()

    this.enabled = false
    this.options = null

    loggers.bootstrap.info('[DevMode] Development mode disabled')
  }

  /**
   * Checks if DevMode is enabled.
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Gets the current DevMode options.
   */
  getOptions(): DevModeOptions | null {
    return this.options
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Bridge Connection
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Connects to the CLI bridge for log streaming.
   * Uses HTTP transport in FiveM, WebSocket in Node.js.
   * @param url - Base URL (will be adapted based on environment)
   */
  async connectToBridge(url: string): Promise<void> {
    if (this.logTransport) {
      await stopDevTransport(this.logTransport)
    }

    const env = detectEnvironment()
    const httpUrl = `${url.replace('ws://', 'http://').replace('wss://', 'https://')}/logs`
    const wsUrl = url.startsWith('http')
      ? url.replace('http://', 'ws://').replace('https://', 'wss://')
      : url

    this.logTransport = createDevTransport({
      httpUrl,
      wsUrl,
    })

    try {
      await startDevTransport(this.logTransport)

      // Setup message handler for WebSocket transport only
      if (isWebSocketTransport(this.logTransport)) {
        this.logTransport.onMessage((data: unknown) => {
          this.handleBridgeMessage(data as BridgeMessage)
        })
      }

      loggers.bootstrap.info(`[DevMode] Connected to CLI bridge (${env} mode)`, { url })
    } catch (error) {
      loggers.bootstrap.warn('[DevMode] Could not connect to CLI bridge', {
        url,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Disconnects from the CLI bridge.
   */
  async disconnectFromBridge(): Promise<void> {
    if (this.logTransport) {
      await stopDevTransport(this.logTransport)
      this.logTransport = null
      loggers.bootstrap.info('[DevMode] Disconnected from CLI bridge')
    }
  }

  /**
   * Sends a message to the CLI bridge (WebSocket only).
   * In HTTP mode, messages are sent via log transport automatically.
   * @param message - Message to send
   */
  sendToBridge(message: BridgeMessage): void {
    if (
      this.logTransport &&
      isWebSocketTransport(this.logTransport) &&
      this.logTransport.isConnected()
    ) {
      this.logTransport.send(message)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // State Inspection
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Captures a snapshot of the current runtime state.
   */
  captureSnapshot(): RuntimeSnapshot {
    return this.inspector.captureSnapshot()
  }

  /**
   * Gets a summary of the current runtime state.
   */
  getSummary(): ReturnType<StateInspectorService['getSummary']> {
    return this.inspector.getSummary()
  }

  /**
   * Gets detailed information about a specific player.
   * @param clientId - Client ID
   */
  getPlayerDetails(clientId: number): Record<string, unknown> | null {
    return this.inspector.getPlayerDetails(clientId)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Event Interception
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Gets the recorded event history.
   */
  getEventHistory(): DevEvent[] {
    return this.interceptor.getEventHistory()
  }

  /**
   * Clears the event history.
   */
  clearEventHistory(): void {
    this.interceptor.clearHistory()
  }

  /**
   * Gets event statistics.
   */
  getEventStatistics(): ReturnType<EventInterceptorService['getStatistics']> {
    return this.interceptor.getStatistics()
  }

  /**
   * Adds a listener for events.
   * @param listener - Event listener function
   * @returns Unsubscribe function
   */
  onEvent(listener: (event: DevEvent) => void): () => void {
    return this.interceptor.addListener(listener)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Player Simulation
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Connects a simulated player.
   * @param options - Player options
   */
  connectPlayer(options?: Parameters<PlayerSimulatorService['connect']>[0]) {
    return this.simulator.connect(options)
  }

  /**
   * Disconnects a simulated player.
   * @param clientId - Client ID
   */
  disconnectPlayer(clientId: number): void {
    this.simulator.disconnect(clientId)
  }

  /**
   * Connects multiple simulated players.
   * @param count - Number of players
   * @param options - Base options
   */
  connectPlayers(count: number, options?: Parameters<PlayerSimulatorService['connect']>[0]) {
    return this.simulator.connectMany(count, options)
  }

  /**
   * Gets simulated player statistics.
   */
  getSimulatorStatistics(): ReturnType<PlayerSimulatorService['getStatistics']> {
    return this.simulator.getStatistics()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────────────────────

  private handleBridgeMessage(message: BridgeMessage): void {
    switch (message.type) {
      case 'ping':
        this.sendToBridge({ type: 'pong', payload: Date.now() })
        break

      case 'command':
        this.handleRemoteCommand(message.payload as { name: string; args: unknown[] })
        break

      case 'reload':
        this.handleRemoteReload(message.payload as { resource: string })
        break

      default:
        loggers.bootstrap.debug('[DevMode] Unknown bridge message type', { type: message.type })
    }
  }

  private handleRemoteCommand(command: { name: string; args: unknown[] }): void {
    loggers.bootstrap.debug('[DevMode] Remote command received', command)

    switch (command.name) {
      case 'snapshot':
        this.sendToBridge({ type: 'state', payload: this.captureSnapshot() })
        break

      case 'events':
        this.sendToBridge({ type: 'event', payload: this.getEventHistory() })
        break

      case 'clear-events':
        this.clearEventHistory()
        this.sendToBridge({ type: 'command', payload: { success: true } })
        break

      case 'connect-player': {
        const player = this.connectPlayer(command.args[0] as any)
        this.sendToBridge({
          type: 'command',
          payload: { success: true, clientId: player.clientId },
        })
        break
      }

      case 'disconnect-player':
        this.disconnectPlayer(command.args[0] as number)
        this.sendToBridge({ type: 'command', payload: { success: true } })
        break

      default:
        loggers.bootstrap.warn('[DevMode] Unknown remote command', { name: command.name })
    }
  }

  private handleRemoteReload(payload: { resource: string }): void {
    loggers.bootstrap.info(`[DevMode] Remote reload requested for: ${payload.resource}`)
    safeExecuteCommand(`restart ${payload.resource}`)
  }
}
