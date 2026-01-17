import { FrameworkMode } from '../runtime'

/**
 * Event captured by the DevMode interceptor.
 */
export interface DevEvent {
  /** Unique event identifier */
  id: string
  /** Unix timestamp in milliseconds */
  timestamp: number
  /** Type of event */
  type: 'net' | 'command' | 'export' | 'fivem' | 'internal'
  /** Event name */
  name: string
  /** Direction of the event */
  direction: 'in' | 'out'
  /** Event arguments */
  args: unknown[]
  /** Result of the event (if completed) */
  result?: unknown
  /** Error message (if failed) */
  error?: string
  /** Execution duration in milliseconds */
  duration?: number
  /** Source information */
  source?: {
    clientId?: number
    resource?: string
  }
}

/**
 * Message sent through the DevMode bridge.
 *
 * @remarks
 * The bridge acts as a telemetry and control tunnel between the OpenCore runtime
 * and the external CLI. It allows for real-time log streaming and state inspection.
 */
export interface BridgeMessage {
  /**
   * Message type:
   * - 'log': Real-time server log streaming
   * - 'event': Notification of a captured event (net, command, etc)
   * - 'state': Runtime state snapshot response
   * - 'command': Control command from CLI (e.g. trigger simulation)
   * - 'ping'/'pong': Connection heartbeat
   */
  type: 'log' | 'event' | 'state' | 'command' | 'ping' | 'pong'
  /** Data associated with the message */
  payload: unknown
}

/**
 * Snapshot of the runtime state.
 *
 * @remarks
 * Used by the CLI to visualize the current state of the framework without
 * requiring game access.
 */
export interface RuntimeSnapshot {
  /** Capture timestamp */
  timestamp: number
  /** Current framework mode (CORE, RESOURCE, STANDALONE) */
  mode: FrameworkMode
  /** Enabled features and their status */
  features: Record<string, boolean>
  /** Player information (simulated and real) */
  players: {
    count: number
    ids: number[]
  }
  /** Registered handlers for discovery */
  handlers: {
    commands: string[]
    netEvents: string[]
    exports: string[]
    fiveMEvents: string[]
  }
  /** DI container information */
  diContainer: {
    registrations: number
    singletons: string[]
  }
}

/**
 * Bridge configuration for CLI connection.
 *
 * @remarks
 * The bridge enables advanced development features like log streaming to CLI
 * and state inspection. It does NOT handle resource restarts (txAdmin handles that).
 */
export interface BridgeOptions {
  /**
   * WebSocket URL of the OpenCore CLI bridge.
   * @defaultValue 'ws://localhost:3848'
   */
  url: string
  /**
   * Whether to connect to the bridge automatically on startup.
   * @defaultValue false
   */
  autoConnect: boolean
  /** Whether to attempt reconnection if connection is lost */
  reconnect?: boolean
  /** Delay between reconnection attempts in milliseconds */
  reconnectInterval?: number
}

/**
 * Event interceptor configuration.
 *
 * @remarks
 * The interceptor captures and records all incoming/outgoing events (Net, Commands, etc.)
 * for debugging purposes.
 */
export interface InterceptorOptions {
  /** Enable event interception */
  enabled: boolean
  /** Whether to keep a history of events in memory */
  recordHistory: boolean
  /** Maximum number of events to keep in the history buffer */
  maxHistorySize: number
}

/**
 * Player simulator configuration.
 *
 * @remarks
 * The simulator allows for creating "virtual" players that the framework
 * treats as real, enabling testing of permissions, economy, and logic without game clients.
 */
export interface SimulatorOptions {
  /** Enable player simulation features */
  enabled: boolean
  /** Number of virtual players to connect automatically on startup */
  autoConnectPlayers: number
}

/**
 * Main DevMode configuration.
 *
 * @remarks
 * Development mode provides tools for debugging, inspection, and simulation.
 * It is dynamically loaded and should be disabled in production.
 */
export interface DevModeOptions {
  /**
   * Master switch for development mode.
   * If false, no dev tools will be loaded.
   */
  enabled: boolean
  /**
   * CLI Bridge configuration for telemetry and logs.
   */
  bridge?: BridgeOptions
  /**
   * Event interceptor for debugging network/command flow.
   */
  interceptor?: InterceptorOptions
  /**
   * Virtual player simulator for offline testing.
   */
  simulator?: SimulatorOptions
}

/**
 * Simulated player configuration.
 */
export interface SimulatedPlayerOptions {
  /** Client ID (auto-generated if not provided) */
  clientId?: number
  /** Account ID */
  accountId?: string
  /** Player name */
  name?: string
  /** Player rank */
  rank?: number
  /** Player permissions */
  permissions?: string[]
  /** Initial states */
  states?: string[]
  /** Custom metadata */
  metadata?: Record<string, unknown>
}

/**
 * Simulated player instance.
 */
export interface SimulatedPlayer {
  /** Client ID */
  clientId: number
  /** Whether the player is connected */
  connected: boolean
  /** Simulated network latency in ms */
  networkLatency: number
  /** Emit a net event as this player */
  emit(eventName: string, ...args: unknown[]): void
  /** Disconnect this player */
  disconnect(): void
}

/**
 * Default DevMode configuration.
 * Centered on telemetry and simulation, delegating resource management to CLI/txAdmin.
 */
export const DEFAULT_DEVMODE_OPTIONS: DevModeOptions = {
  enabled: false,
  bridge: {
    url: 'ws://localhost:3848',
    autoConnect: false,
    reconnect: true,
    reconnectInterval: 5000,
  },
  interceptor: {
    enabled: true,
    recordHistory: true,
    maxHistorySize: 1000,
  },
  simulator: {
    enabled: true,
    autoConnectPlayers: 0,
  },
}
