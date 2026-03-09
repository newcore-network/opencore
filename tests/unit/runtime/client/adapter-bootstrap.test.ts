import 'reflect-metadata'
import { beforeEach, describe, expect, it } from 'vitest'
import { Vector3 } from '../../../../src/kernel/utils/vector3'
import { IClientLocalPlayerBridge } from '../../../../src/runtime/client/adapter/local-player-bridge'
import { defineClientAdapter } from '../../../../src/runtime/client/adapter/client-adapter'
import { di } from '../../../../src/runtime/client/client-container'
import { initClientCore } from '../../../../src/runtime/client/client-bootstrap'
import { IClientRuntimeBridge } from '../../../../src/runtime/client/adapter/runtime-bridge'
import { getActiveClientAdapterName } from '../../../../src/runtime/client/adapter/registry'
import { getClientRuntimeContext } from '../../../../src/runtime/client/client-runtime'
import { WebView } from '../../../../src/runtime/client/webview-bridge'
import { resetContainer } from '../../../helpers/di.helper'

class CustomRuntimeBridge extends IClientRuntimeBridge {
  public readonly messages: string[] = []

  getCurrentResourceName(): string {
    return 'custom-resource'
  }

  on(_eventName: string, _handler: (...args: any[]) => void | Promise<void>): void {}

  registerCommand(
    _commandName: string,
    _handler: (...args: any[]) => void,
    _restricted: boolean,
  ): void {}

  registerKeyMapping(
    _commandName: string,
    _description: string,
    _inputMapper: string,
    _key: string,
  ): void {}

  setTick(_handler: () => void | Promise<void>): unknown {
    return 0
  }

  clearTick(_handle: unknown): void {}

  getGameTimer(): number {
    return 0
  }

  registerNuiCallback(
    _eventName: string,
    _handler: (data: any, cb: (response: unknown) => void) => void | Promise<void>,
  ): void {}

  sendNuiMessage(message: string): void {
    this.messages.push(message)
  }

  setNuiFocus(_hasFocus: boolean, _hasCursor: boolean): void {}

  setNuiFocusKeepInput(_keepInput: boolean): void {}

  registerExport(_exportName: string, _handler: (...args: any[]) => any): void {}
}

class NoopLocalPlayerBridge extends IClientLocalPlayerBridge {
  setPosition(_position: Vector3, _heading?: number): void {}
}

describe('client adapter bootstrap', () => {
  beforeEach(() => {
    resetContainer()
  })

  it('installs the default node client adapter', async () => {
    await initClientCore({ mode: 'STANDALONE' })

    expect(getActiveClientAdapterName()).toBe('node')
    expect(di.isRegistered(IClientRuntimeBridge as any)).toBe(true)

    const runtime = di.resolve(IClientRuntimeBridge as any) as IClientRuntimeBridge
    expect(runtime.getCurrentResourceName()).toBe('default')
  })

  it('uses the active runtime bridge even when WebView is imported before init', async () => {
    const runtime = new CustomRuntimeBridge()
    const adapter = defineClientAdapter({
      name: 'custom-webview',
      async register(ctx) {
        const { NodeMessagingTransport } = await import('../../../../src/adapters/node/transport/adapter')
        ctx.bindMessagingTransport(new NodeMessagingTransport('client'))
        ctx.bindInstance(IClientRuntimeBridge as any, runtime)
        ctx.bindInstance(IClientLocalPlayerBridge as any, new NoopLocalPlayerBridge())
      },
    })

    await initClientCore({ mode: 'STANDALONE', adapter })

    WebView.send('open', { ok: true })

    expect(runtime.messages).toHaveLength(1)
    expect(runtime.messages[0]).toContain('"action":"open"')
    expect(getClientRuntimeContext()?.resourceName).toBe('custom-resource')
  })

  it('throws when re-initialized with a different adapter', async () => {
    const makeAdapter = (name: string) =>
      defineClientAdapter({
        name,
        async register(ctx) {
          const { NodeMessagingTransport } = await import(
            '../../../../src/adapters/node/transport/adapter'
          )
          ctx.bindMessagingTransport(new NodeMessagingTransport('client'))
          ctx.bindInstance(IClientRuntimeBridge as any, new CustomRuntimeBridge())
          ctx.bindInstance(IClientLocalPlayerBridge as any, new NoopLocalPlayerBridge())
        },
      })

    await initClientCore({ mode: 'STANDALONE', adapter: makeAdapter('alpha') })

    await expect(initClientCore({ mode: 'STANDALONE', adapter: makeAdapter('beta') })).rejects.toThrow(
      "does not match active adapter 'alpha'",
    )
  })
})
