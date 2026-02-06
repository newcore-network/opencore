import { EventContext } from './context'

export interface RpcContext extends EventContext {
  /**
   * Unique id used to correlate request/response (and ACK when applicable).
   */
  requestId: string
}

/**
 * Target used when the caller wants to address one or more remote peers.
 *
 * @remarks
 * Typically used on the server to call/notify one or more clients.
 * Some transports/environments may ignore the target (e.g. in-process Node adapters).
 */
export type RpcTarget = number | number[] | 'all'

/**
 * Remote Procedure Call API.
 *
 * @remarks
 * `RpcAPI` defines the contract for request/response style events.
 *
 * Direction depends on runtime:
 * - Server runtime:
 *   - `on()` registers handlers callable by clients.
 *   - `call()/notify()` typically invokes handlers on clients (using {@link RpcTarget}).
 * - Client runtime:
 *   - `on()` registers handlers callable by server.
 *   - `call()/notify()` typically invokes handlers on server.
 *
 * Transport implementations decide whether this is remote (network) or local (in-process):
 * - FiveM transports: remote client<->server.
 * - Node transports: often in-process (single runtime) and may ignore {@link RpcTarget}.
 */
export abstract class RpcAPI {
  /**
   * Register an RPC handler.
   *
   * Server:
   *   - callable from clients
   * Client:
   *   - callable from server
   *
   * @remarks
   * The handler receives a {@link RpcContext}. In server environments this usually includes
   * the `clientId` of the caller (via {@link EventContext}).
   */
  abstract on<TArgs extends any[], TResult>(
    name: string,
    handler: (ctx: RpcContext, ...args: TArgs) => TResult | Promise<TResult>,
  ): void

  /**
   * Call an RPC and wait for the result.
   *
   * @remarks
   * Use this when you need a return value.
   */
  abstract call<TResult = unknown>(name: string, args?: any[]): Promise<TResult>

  abstract call<TResult = unknown>(name: string, target: RpcTarget, args?: any[]): Promise<TResult>

  /**
   * Notify an RPC and wait for ACK. (acknowledgments)
   *
   * @remarks
   * Use this when you only need delivery confirmation (no return value).
   */
  abstract notify(name: string, args?: any[]): Promise<void>

  abstract notify(name: string, target: RpcTarget, args?: any[]): Promise<void>
}
