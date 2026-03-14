import type { InjectionToken } from 'tsyringe'
import { IPedAppearanceClient } from '../../../adapters/contracts/client/IPedAppearanceClient'
import { IHasher } from '../../../adapters/contracts/IHasher'
import { IClientLocalPlayerBridge } from './local-player-bridge'
import { NodeClientLocalPlayerBridge } from './node-local-player-bridge'
import { IClientLogConsole } from '../../../adapters/contracts/client/IClientLogConsole'
import { IClientSpawnBridge } from '../../../adapters/contracts/client/spawn/IClientSpawnBridge'
import { IClientBlipBridge } from '../../../adapters/contracts/client/ui/IClientBlipBridge'
import { IClientMarkerBridge } from '../../../adapters/contracts/client/ui/IClientMarkerBridge'
import { IClientNotificationBridge } from '../../../adapters/contracts/client/ui/IClientNotificationBridge'
import { IClientWebViewBridge } from '../../../adapters/contracts/client/ui/webview/IClientWebViewBridge'
import { installNodeClientLogConsole, NodeClientLogConsole } from './node-log-console'
import { NodeClientPlatformBridge } from './node-platform-bridge'
import { NodeClientSpawnBridge } from './node-spawn-bridge'
import { NodeClientWebViewBridge } from './node-webview-bridge'
import { PlatformBlipBridge } from './platform-blip-bridge'
import { PlatformMarkerBridge } from './platform-marker-bridge'
import { PlatformNotificationBridge } from './platform-notification-bridge'
import { IClientPlatformBridge } from './platform-bridge'
import { NodeClientRuntimeBridge } from './node-runtime-bridge'
import { defineClientAdapter, type OpenCoreClientAdapter } from './client-adapter'
import { IClientRuntimeBridge } from './runtime-bridge'

/**
 * Default client adapter used when no runtime adapter is provided.
 */
export function createNodeClientAdapter(): OpenCoreClientAdapter {
  return defineClientAdapter({
    name: 'node',
    async register(ctx) {
      const [{ NodeMessagingTransport }, { NodePedAppearanceClient }, { NodeHasher }] =
        await Promise.all([
          import('../../../adapters/node/transport/adapter'),
          import('../../../adapters/node/node-ped-appearance-client'),
          import('../../../adapters/node/node-hasher'),
        ])

      const transport = new NodeMessagingTransport('client')
      ctx.bindMessagingTransport(transport)
      ctx.bindSingleton(
        IPedAppearanceClient as InjectionToken<IPedAppearanceClient>,
        NodePedAppearanceClient,
      )
      ctx.bindSingleton(IHasher as InjectionToken<IHasher>, NodeHasher)
      ctx.bindSingleton(
        IClientRuntimeBridge as InjectionToken<IClientRuntimeBridge>,
        NodeClientRuntimeBridge,
      )
      ctx.bindSingleton(
        IClientLocalPlayerBridge as InjectionToken<IClientLocalPlayerBridge>,
        NodeClientLocalPlayerBridge,
      )
      ctx.bindSingleton(
        IClientPlatformBridge as InjectionToken<IClientPlatformBridge>,
        NodeClientPlatformBridge,
      )
      ctx.bindSingleton(
        IClientSpawnBridge as InjectionToken<IClientSpawnBridge>,
        NodeClientSpawnBridge,
      )
      ctx.bindSingleton(IClientBlipBridge as InjectionToken<IClientBlipBridge>, PlatformBlipBridge)
      ctx.bindSingleton(
        IClientMarkerBridge as InjectionToken<IClientMarkerBridge>,
        PlatformMarkerBridge,
      )
      ctx.bindSingleton(
        IClientNotificationBridge as InjectionToken<IClientNotificationBridge>,
        PlatformNotificationBridge,
      )
      ctx.bindSingleton(
        IClientWebViewBridge as InjectionToken<IClientWebViewBridge>,
        NodeClientWebViewBridge,
      )
      ctx.bindSingleton(
        IClientLogConsole as InjectionToken<IClientLogConsole>,
        NodeClientLogConsole,
      )
      installNodeClientLogConsole(new NodeClientLogConsole())
    },
  })
}
