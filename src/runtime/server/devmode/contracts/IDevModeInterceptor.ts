import { DevEvent } from '../types'

/**
 * Contract for intercepting and recording runtime events.
 *
 * Used for debugging, monitoring, and replaying events during development.
 */
export abstract class IDevModeInterceptor {
  /**
   * Called before an event is processed.
   * @param event - Event data without result/duration
   */
  abstract onEventBefore(event: Omit<DevEvent, 'result' | 'duration'>): void

  /**
   * Called after an event completes successfully.
   * @param event - Complete event data including result and duration
   */
  abstract onEventAfter(event: DevEvent): void

  /**
   * Called when an event fails with an error.
   * @param event - Event data with error information
   */
  abstract onEventError(event: DevEvent): void

  /**
   * Gets the recorded event history.
   * @returns Array of recorded events
   */
  abstract getEventHistory(): DevEvent[]

  /**
   * Clears the event history.
   */
  abstract clearHistory(): void

  /**
   * Enables or disables event interception.
   * @param enabled - Whether to enable interception
   */
  abstract setEnabled(enabled: boolean): void

  /**
   * Checks if interception is enabled.
   */
  abstract isEnabled(): boolean
}
