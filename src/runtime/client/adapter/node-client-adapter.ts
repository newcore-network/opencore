import type { InjectionToken } from 'tsyringe'
import { IGtaPedAppearanceBridge } from '../../../adapters/contracts/client/IGtaPedAppearanceBridge'
import { IHasher } from '../../../adapters/contracts/IHasher'
import { IClientLocalPlayerBridge } from './local-player-bridge'
import { NodeClientLocalPlayerBridge } from './node-local-player-bridge'
import { NodeClientNotificationBridge } from './node-notification-bridge'
import { IClientLogConsole } from '../../../adapters/contracts/client/IClientLogConsole'
import { IClientSpawnBridge } from '../../../adapters/contracts/client/spawn/IClientSpawnBridge'
import { IClientSpawnPort } from '../../../adapters/contracts/client/spawn/IClientSpawnPort'
import { IClientBlipBridge } from '../../../adapters/contracts/client/ui/IClientBlipBridge'
import { IClientMarkerBridge } from '../../../adapters/contracts/client/ui/IClientMarkerBridge'
import { IClientNotificationBridge } from '../../../adapters/contracts/client/ui/IClientNotificationBridge'
import { IClientWebViewBridge } from '../../../adapters/contracts/client/ui/webview/IClientWebViewBridge'
import { installNodeClientLogConsole, NodeClientLogConsole } from './node-log-console'
import { NodeClientBlipBridge } from './node-blip-bridge'
import { NodeClientCameraPort } from './node-camera-port'
import { NodeClientMarkerBridge } from './node-marker-bridge'
import { NodeClientPedPort } from './node-ped-port'
import { NodeClientPlatformBridge } from './node-platform-bridge'
import { NodeClientProgressPort } from './node-progress-port'
import { NodeClientSpawnBridge } from './node-spawn-bridge'
import { NodeClientVehiclePort } from './node-vehicle-port'
import { NodeClientWebViewBridge } from './node-webview-bridge'
import { IClientPlatformBridge } from './platform-bridge'
import { NodeClientRuntimeBridge } from './node-runtime-bridge'
import { defineClientAdapter, type OpenCoreClientAdapter } from './client-adapter'
import { IClientRuntimeBridge } from './runtime-bridge'
import { IClientCameraPort } from '../../../adapters/contracts/client/camera/IClientCameraPort'
import { IClientPedPort } from '../../../adapters/contracts/client/ped/IClientPedPort'
import { IClientProgressPort } from '../../../adapters/contracts/client/progress/IClientProgressPort'
import { IClientVehiclePort } from '../../../adapters/contracts/client/vehicle/IClientVehiclePort'

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
        IGtaPedAppearanceBridge as InjectionToken<IGtaPedAppearanceBridge>,
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
        IClientCameraPort as InjectionToken<IClientCameraPort>,
        NodeClientCameraPort,
      )
      ctx.bindSingleton(
        IClientVehiclePort as InjectionToken<IClientVehiclePort>,
        NodeClientVehiclePort,
      )
      ctx.bindSingleton(IClientPedPort as InjectionToken<IClientPedPort>, NodeClientPedPort)
      ctx.bindSingleton(IClientProgressPort as InjectionToken<IClientProgressPort>, NodeClientProgressPort)
      ctx.bindSingleton(
        IClientSpawnPort as InjectionToken<IClientSpawnPort>,
        NodeClientSpawnBridge,
      )
      ctx.bindFactory(IClientSpawnBridge as InjectionToken<IClientSpawnBridge>, () =>
        ctx.container.resolve(IClientSpawnPort as InjectionToken<IClientSpawnPort>),
      )
      ctx.bindSingleton(
        IClientBlipBridge as InjectionToken<IClientBlipBridge>,
        NodeClientBlipBridge,
      )
      ctx.bindSingleton(
        IClientMarkerBridge as InjectionToken<IClientMarkerBridge>,
        NodeClientMarkerBridge,
      )
      ctx.bindSingleton(
        IClientNotificationBridge as InjectionToken<IClientNotificationBridge>,
        NodeClientNotificationBridge,
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
