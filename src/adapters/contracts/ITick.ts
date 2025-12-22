/**
 * Platform-agnostic tick/interval abstraction
 */
export abstract class ITick {
  /**
   * Registers a recurring handler that executes on each tick/interval
   * @param handler - The function to execute
   */
  abstract setTick(handler: () => void | Promise<void>): void
}
