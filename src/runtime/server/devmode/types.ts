import type { FrameworkMode } from '../runtime'

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
 */
export interface BridgeMessage {
  type: 'log' | 'event' | 'state' | 'command' | 'reload' | 'ping' | 'pong'
  payload: unknown
}

/**
 * Snapshot of the runtime state.
 */
export interface RuntimeSnapshot {
  /** Capture timestamp */
  timestamp: number
  /** Current framework mode */
  mode: FrameworkMode
  /** Enabled features */
  features: Record<string, boolean>
  /** Player information */
  players: {
    count: number
    ids: number[]
  }
  /** Registered handlers */
  handlers: {
    commands: string[]
    netEvents: string[]
    exports: string[]
    fiveMEvents: string[]
  }
  /** DI container info */
  diContainer: {
    registrations: number
    singletons: string[]
  }
}

/**
 * Hot reload configuration.
 */
export interface HotReloadOptions {
  /** Enable hot reload server */
  enabled: boolean
  /** HTTP port for reload endpoint */
  port: number
  /** Resources allowed to trigger reload (empty = all) */
  allowedResources?: string[]
}

/**
 * Bridge configuration for CLI connection.
 */
export interface BridgeOptions {
  /** WebSocket URL to connect to */
  url: string
  /** Auto-connect on dev mode start */
  autoConnect: boolean
  /** Reconnect on disconnect */
  reconnect?: boolean
  /** Reconnect interval in milliseconds */
  reconnectInterval?: number
}

/**
 * Event interceptor configuration.
 */
export interface InterceptorOptions {
  /** Enable event interception */
  enabled: boolean
  /** Record event history */
  recordHistory: boolean
  /** Maximum events to keep in history */
  maxHistorySize: number
}

/**
 * Player simulator configuration.
 */
export interface SimulatorOptions {
  /** Enable player simulation */
  enabled: boolean
  /** Number of players to auto-connect on start */
  autoConnectPlayers: number
}

/**
 * Main DevMode configuration.
 */
export interface DevModeOptions {
  /** Enable dev mode */
  enabled: boolean
  /** Hot reload configuration */
  hotReload?: HotReloadOptions
  /** Bridge configuration */
  bridge?: BridgeOptions
  /** Interceptor configuration */
  interceptor?: InterceptorOptions
  /** Simulator configuration */
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
 */
export const DEFAULT_DEVMODE_OPTIONS: DevModeOptions = {
  enabled: false,
  hotReload: {
    enabled: true,
    port: 3847,
  },
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
