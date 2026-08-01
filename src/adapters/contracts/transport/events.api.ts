import { EventContext, RuntimeContext } from './context'
import { Player } from '../../../runtime/server/entities/player'
import type {
  ArgsOf,
  ClientEvents,
  NameOf,
  ServerEvents,
} from '../../../runtime/shared/types/register'

/**
 * The map of events this runtime may *emit*.
 *
 * @remarks
 * A server emits to clients, so it is constrained by the client's `@Client.OnNet` handlers,
 * and vice versa. Both resolve to a loose `Record<string, unknown[]>` when typegen is off.
 */
type EmitEventMap<C extends RuntimeContext> = C extends 'server' ? ClientEvents : ServerEvents

/*
 * Note: only the *emitting* side is narrowed. `on()` keeps inferring its argument types from
 * the handler, because those handlers are precisely what the generator reads to build the
 * event map — constraining them against the generated map would be circular.
 */

/** Coerces a resolved payload type back into a rest-parameter-compatible tuple. */
type AsArgs<A> = A extends unknown[] ? A : unknown[]

type EmitArgs<C extends RuntimeContext, A = unknown[]> = C extends 'server'
  ? [target: Player | number | number[] | 'all', ...args: AsArgs<A>]
  : [...args: AsArgs<A>]

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
   *
   * @remarks
   * When typegen is active, `event` autocompletes to the names declared by the receiving side
   * and `args` is checked against that handler's signature.
   */
  abstract emit<K extends NameOf<EmitEventMap<C>>>(
    event: K,
    ...args: EmitArgs<C, ArgsOf<EmitEventMap<C>, K>>
  ): void
}
