// transport/core/rpc.api.ts

import { EventContext } from './context'

export interface RpcContext extends EventContext {
  requestId: string
}

export type RpcTarget = number | number[] | 'all'

export abstract class RpcAPI {
  /**
   * Register an RPC handler.
   *
   * Server:
   *   - callable from clients
   * Client:
   *   - callable from server
   */
  abstract on<TArgs extends any[], TResult>(
    name: string,
    handler: (ctx: RpcContext, ...args: TArgs) => TResult | Promise<TResult>,
  ): void

  /**
   * Call an RPC and wait for the result.
   */
  abstract call<TResult = unknown>(name: string, args?: any[]): Promise<TResult>

  abstract call<TResult = unknown>(name: string, target: RpcTarget, args?: any[]): Promise<TResult>

  /**
   * Notify an RPC and wait for ACK.
   */
  abstract notify(name: string, args?: any[]): Promise<void>

  abstract notify(name: string, target: RpcTarget, args?: any[]): Promise<void>
}
