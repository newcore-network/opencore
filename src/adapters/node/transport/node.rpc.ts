import { randomUUID } from 'node:crypto'
import { RpcAPI, type RpcTarget } from '../../contracts/transport/rpc.api'
import type { RuntimeContext } from '../../contracts/transport/context'

export class NodeRpc<C extends RuntimeContext = RuntimeContext> extends RpcAPI<C> {
  private readonly handlers = new Map<
    string,
    (ctx: { requestId: string; clientId?: number; raw?: unknown }, ...args: any[]) => unknown
  >()

  constructor(private readonly context: C) {
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

  call<TResult = unknown>(name: string, ...args: any[]): Promise<TResult> {
    const { target, payload } = this.normalizeInvocation(name, 'call', args)
    return this.executeCall<TResult>(name, payload, target)
  }

  notify(name: string, ...args: any[]): Promise<void> {
    const { target, payload } = this.normalizeInvocation(name, 'notify', args)
    return this.executeNotify(name, payload, target)
  }

  private normalizeInvocation(
    name: string,
    kind: 'call' | 'notify',
    args: any[],
  ): { target?: RpcTarget; payload: any[] } {
    if (this.context === 'server') {
      if (args.length === 0) {
        throw new Error(`NodeRpc: missing target for '${kind}' '${name}' in server context`)
      }

      const [target, ...payload] = args
      if (!this.isValidTarget(target)) {
        throw new Error(`NodeRpc: invalid target for '${kind}' '${name}'`)
      }

      if (kind === 'call' && target === 'all') {
        throw new Error(`NodeRpc: target=all is not supported for call '${name}'`)
      }

      return { target, payload }
    }

    return { target: undefined, payload: args }
  }

  private isValidTarget(value: unknown): value is RpcTarget {
    if (value === 'all') return true
    if (typeof value === 'number') return true
    if (Array.isArray(value)) return value.every((item) => typeof item === 'number')
    return false
  }

  private async executeCall<TResult>(
    name: string,
    payload: any[],
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
        ...(payload ?? []),
      ),
    )
    return result as TResult
  }

  private async executeNotify(name: string, payload: any[], _target?: RpcTarget): Promise<void> {
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
        ...(payload ?? []),
      ),
    )
  }
}
