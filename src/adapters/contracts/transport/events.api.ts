import { EventContext } from './context'

/**
 * broadcast and listen to events without relying on runtime. The adapter will be used.
 */
export abstract class EventsAPI {
  /**
   * Listen to an event.
   *
   * Server:
   *   - triggered by clients
   * Client:
   *   - triggered by server
   */
  abstract on(
    event: string,
    handler: (ctx: EventContext, ...args: any[]) => void | Promise<void>,
  ): void

  /**
   * Emit an event.
   *
   * Server:
   *   - sends to client(s)
   * Client:
   *   - sends to server, targetOrArg will be ignored
   */
  abstract emit(event: string, targetOrArg?: number | number[] | 'all' | any, ...args: any[]): void
}
