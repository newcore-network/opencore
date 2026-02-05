import { randomUUID } from 'node:crypto'
import { RpcAPI, type RpcTarget } from '../../contracts/transport/rpc.api'
import type { RuntimeContext } from '../../contracts/transport/context'

export class NodeRpc extends RpcAPI {
  private readonly handlers = new Map<
    string,
    (ctx: { requestId: string; clientId?: number; raw?: unknown }, ...args: any[]) => unknown
  >()

  constructor(private readonly context: RuntimeContext) {
    super()
  }

  on<TArgs extends any[], TResult>(
    name: string,
    handler: (
      ctx: { requestId: string; clientId?: number; raw?: unknown },
      ...args: TArgs
    ) => TResult | Promise<TResult>,
  ): void {
    this.handlers.set(name, handler as any)
  }

  call<TResult = unknown>(name: string, args?: any[]): Promise<TResult>
  call<TResult = unknown>(name: string, target: RpcTarget, args?: any[]): Promise<TResult>
  call<TResult = unknown>(
    name: string,
    targetOrArgs?: RpcTarget | any[],
    maybeArgs?: any[],
  ): Promise<TResult> {
    const { target, args } = this.normalizeTargetAndArgs(targetOrArgs, maybeArgs)
    return this.executeCall<TResult>(name, args, target)
  }

  notify(name: string, args?: any[]): Promise<void>
  notify(name: string, target: RpcTarget, args?: any[]): Promise<void>
  notify(name: string, targetOrArgs?: RpcTarget | any[], maybeArgs?: any[]): Promise<void> {
    const { target, args } = this.normalizeTargetAndArgs(targetOrArgs, maybeArgs)
    return this.executeNotify(name, args, target)
  }

  private normalizeTargetAndArgs(
    targetOrArgs?: RpcTarget | any[],
    maybeArgs?: any[],
  ): { target?: RpcTarget; args: any[] } {
    if (Array.isArray(targetOrArgs) || targetOrArgs === undefined) {
      return { target: undefined, args: (targetOrArgs ?? []) as any[] }
    }
    return { target: targetOrArgs, args: (maybeArgs ?? []) as any[] }
  }

  private async executeCall<TResult>(
    name: string,
    args: any[],
    _target?: RpcTarget,
  ): Promise<TResult> {
    const handler = this.handlers.get(name)
    if (!handler) {
      throw new Error(`NodeRpc: no handler registered for '${name}'`)
    }

    const requestId = randomUUID()
    const result = await Promise.resolve(
      handler(
        {
          requestId,
          clientId: this.context === 'server' ? undefined : undefined,
          raw: undefined,
        },
        ...(args ?? []),
      ),
    )
    return result as TResult
  }

  private async executeNotify(name: string, args: any[], _target?: RpcTarget): Promise<void> {
    const handler = this.handlers.get(name)
    if (!handler) {
      return
    }
    const requestId = randomUUID()
    await Promise.resolve(
      handler(
        {
          requestId,
          clientId: undefined,
          raw: undefined,
        },
        ...(args ?? []),
      ),
    )
  }
}
