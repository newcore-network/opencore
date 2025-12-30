import { RuntimeSnapshot } from '../types'

/**
 * Handler metadata for inspection.
 */
export interface HandlerInfo {
  name: string
  controller: string
  method: string
  metadata?: Record<string, unknown>
}

/**
 * DI registration info for inspection.
 */
export interface DIRegistration {
  token: string
  implementation: string
  lifecycle: 'singleton' | 'transient'
}

/**
 * Contract for inspecting runtime state during development.
 *
 * Provides insights into registered handlers, DI container state,
 * and player information for debugging purposes.
 */
export abstract class IDevModeInspector {
  /**
   * Captures a complete snapshot of the current runtime state.
   * @returns Runtime snapshot with all relevant information
   */
  abstract captureSnapshot(): RuntimeSnapshot

  /**
   * Gets all registered handlers grouped by type.
   * @returns Map of handler type to handler info array
   */
  abstract getRegisteredHandlers(): Map<string, HandlerInfo[]>

  /**
   * Gets the DI container registration graph.
   * @returns Array of DI registrations
   */
  abstract getDIGraph(): DIRegistration[]

  /**
   * Gets player states for all connected players.
   * @returns Map of client ID to state array
   */
  abstract getPlayerStates(): Map<number, string[]>

  /**
   * Gets detailed info for a specific handler.
   * @param type - Handler type (command, netEvent, export, etc.)
   * @param name - Handler name
   */
  abstract getHandlerInfo(type: string, name: string): HandlerInfo | null
}
