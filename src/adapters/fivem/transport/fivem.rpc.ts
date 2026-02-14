import { v4 as uuid } from 'uuid'
import { RpcAPI, type RpcTarget } from '../../contracts/transport/rpc.api'
import type { RuntimeContext } from '../../contracts/transport/context'

type RpcWireCall = {
  kind: 'call'
  id: string
  name: string
  args: unknown[]
}

type RpcWireNotify = {
  kind: 'notify'
  id: string
  name: string
  args: unknown[]
}

type RpcWireResult = {
  kind: 'result'
  id: string
  ok: true
  result: unknown
}

type RpcWireError = {
  kind: 'result'
  id: string
  ok: false
  error: {
    message: string
    name?: string
  }
}

type RpcWireAck = {
  kind: 'ack'
  id: string
}

type RpcWireMessage = RpcWireCall | RpcWireNotify | RpcWireResult | RpcWireError | RpcWireAck

type PendingEntry<TResult> = {
  resolve: (value: TResult) => void
  reject: (reason?: unknown) => void
  timeout: ReturnType<typeof setTimeout>
}

export class FiveMRpc<C extends RuntimeContext = RuntimeContext> extends RpcAPI<C> {
  private readonly pending = new Map<string, PendingEntry<unknown>>()
  private readonly handlers = new Map<
    string,
    (ctx: { requestId: string; clientId?: number; raw?: unknown }, ...args: any[]) => unknown
  >()

  private readonly requestEvent = '__oc:rpc:req'
  private readonly responseEvent = '__oc:rpc:res'

  private readonly defaultTimeoutMs = 7_500

  constructor(private readonly context: C) {
    super()

    onNet(this.requestEvent, (msg: RpcWireMessage) => {
      void this.handleRequestMessage(msg)
    })

    onNet(this.responseEvent, (msg: RpcWireMessage) => {
      this.handleResponseMessage(msg)
    })
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
    return this.sendAndWait<TResult>({ kind: 'call', name, args: payload }, target)
  }

  notify(name: string, ...args: any[]): Promise<void> {
    const { target, payload } = this.normalizeInvocation(name, 'notify', args)
    return this.sendAndWait<void>({ kind: 'notify', name, args: payload }, target)
  }

  private normalizeInvocation(
    name: string,
    kind: 'call' | 'notify',
    args: any[],
  ): { target?: RpcTarget; payload: any[] } {
    if (this.context === 'server') {
      if (args.length === 0) {
        throw new Error(`FiveMRpc: missing target for '${kind}' '${name}' in server context`)
      }

      const [target, ...payload] = args
      if (!this.isValidTarget(target)) {
        throw new Error(`FiveMRpc: invalid target for '${kind}' '${name}'`)
      }

      if (kind === 'call' && target === 'all') {
        throw new Error(`FiveMRpc: target=all is not supported for call '${name}'`)
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

  private sendAndWait<TResult>(
    input: { kind: 'call' | 'notify'; name: string; args: unknown[] },
    target?: RpcTarget,
  ): Promise<TResult> {
    const id = uuid()

    const msg: RpcWireMessage = {
      kind: input.kind,
      id,
      name: input.name,
      args: input.args ?? [],
    } as RpcWireMessage

    return new Promise<TResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(
          new Error(
            `FiveMRpc: timeout waiting for '${input.kind}' response for '${input.name}' (${id})`,
          ),
        )
      }, this.defaultTimeoutMs)

      this.pending.set(id, { resolve: resolve as any, reject, timeout })

      if (this.context === 'server') {
        const resolvedTarget = this.resolveServerTarget(target, input.kind, input.name)
        emitNet(this.requestEvent, resolvedTarget, msg)
      } else {
        emitNet(this.requestEvent, msg)
      }
    })
  }

  private resolveServerTarget(
    target: RpcTarget | undefined,
    kind: 'call' | 'notify',
    name: string,
  ): number | number[] | -1 {
    if (target === undefined) {
      throw new Error(`FiveMRpc: missing target for '${kind}' '${name}' in server context`)
    }
    if (kind === 'call' && target === 'all') {
      throw new Error(`FiveMRpc: target=all is not supported for call '${name}'`)
    }
    if (target === 'all') return -1
    return target
  }

  private async handleRequestMessage(msg: RpcWireMessage): Promise<void> {
    if (msg.kind !== 'call' && msg.kind !== 'notify') return

    const handler = this.handlers.get(msg.name)

    const sourceId = this.context === 'server' ? (global as any).source : undefined
    const replyTarget = this.context === 'server' ? sourceId : undefined

    if (!handler) {
      if (msg.kind === 'call') {
        this.emitResponse(replyTarget, {
          kind: 'result',
          id: msg.id,
          ok: false,
          error: { message: `FiveMRpc: no handler registered for '${msg.name}'` },
        })
      } else {
        this.emitResponse(replyTarget, { kind: 'ack', id: msg.id })
      }
      return
    }

    try {
      const result = await Promise.resolve(
        handler(
          {
            requestId: msg.id,
            clientId: sourceId,
            raw: sourceId,
          },
          ...(msg.args as any[]),
        ),
      )

      if (msg.kind === 'notify') {
        this.emitResponse(replyTarget, { kind: 'ack', id: msg.id })
      } else {
        this.emitResponse(replyTarget, { kind: 'result', id: msg.id, ok: true, result })
      }
    } catch (err: any) {
      if (msg.kind === 'notify') {
        this.emitResponse(replyTarget, { kind: 'ack', id: msg.id })
        return
      }

      this.emitResponse(replyTarget, {
        kind: 'result',
        id: msg.id,
        ok: false,
        error: {
          message: err?.message ? String(err.message) : String(err),
          name: err?.name ? String(err.name) : undefined,
        },
      })
    }
  }

  private handleResponseMessage(msg: RpcWireMessage): void {
    if (msg.kind !== 'result' && msg.kind !== 'ack') return

    const pending = this.pending.get(msg.id)
    if (!pending) return

    clearTimeout(pending.timeout)
    this.pending.delete(msg.id)

    if (msg.kind === 'ack') {
      pending.resolve(undefined)
      return
    }

    if (msg.ok) {
      pending.resolve(msg.result)
      return
    }

    const error = new Error(msg.error?.message ?? 'FiveMRpc: remote error')
    ;(error as any).name = msg.error?.name ?? error.name
    pending.reject(error)
  }

  private emitResponse(target: number | undefined, msg: RpcWireMessage): void {
    if (this.context === 'server') {
      emitNet(this.responseEvent, target ?? -1, msg)
      return
    }
    emitNet(this.responseEvent, msg)
  }
}
