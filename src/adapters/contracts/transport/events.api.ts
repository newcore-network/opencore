import { EventContext, RuntimeContext } from './context'
import { Player } from '../../../runtime/server/entities/player'

type EmitArgs<C extends RuntimeContext> = C extends 'server'
  ? [target: Player | number | number[] | 'all', ...args: unknown[]]
  : [...args: unknown[]]

/**
 * broadcast and listen to events without relying on runtime. The adapter will be used.
 */
export abstract class EventsAPI<C extends RuntimeContext> {
  /**
   * Listen to an event.
   *
   * Server:
   *   - triggered by clients
   * Client:
   *   - triggered by server
   */
  abstract on<TArgs extends readonly unknown[]>(
    event: string,
    handler: (ctx: EventContext, ...args: TArgs) => void | Promise<void>,
  ): void

  /**
   * Emit an event.
   *  SERVER → CLIENT
   * Server:
   *   - sends to client(s)
   * Client:
   *   - sends to server, targetOrArg will be ignored
   */
  abstract emit(event: string, target: Player | number | number[] | 'all', ...args: unknown[]): void

  /**
   * Emit an event.
   *  CLIENT → SERVER
   * Server:
   *   - sends to client(s)
   * Client:
   *   - sends to server, targetOrArg will be ignored
   */
  abstract emit(event: string, ...args: EmitArgs<C>): void
}
