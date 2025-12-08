import { MetadataScanner } from '../system/metadata.scanner'
import { di } from './client-container'
import { clientControllerRegistry } from './decorators'
import { playerClientLoader } from './player/player.loader'
import {
  BlipService,
  MarkerService,
  NotificationService,
  PedService,
  ProgressService,
  SpawnService,
  StreamingService,
  TextUIService,
  VehicleService,
} from './services'
import { registerSystemClient } from './system/processors.register'
import { NuiBridge } from './ui-bridge'

// Services

const bootServices = [SpawnService] as const

/**
 * Basic setup for client, for configs, decorators, containers... etc
 */
function setSingletons() {
  // Core services
  di.registerSingleton(SpawnService, SpawnService)

  // NUI
  di.registerSingleton(NuiBridge, NuiBridge)

  // UI services
  di.registerSingleton(NotificationService, NotificationService)
  di.registerSingleton(TextUIService, TextUIService)
  di.registerSingleton(ProgressService, ProgressService)

  // World services
  di.registerSingleton(MarkerService, MarkerService)
  di.registerSingleton(BlipService, BlipService)
  di.registerSingleton(VehicleService, VehicleService)
  di.registerSingleton(PedService, PedService)

  // Streaming services
  di.registerSingleton(StreamingService, StreamingService)
}

async function bootstraper() {
  for (const Service of bootServices) {
    const instance = di.resolve(Service)
    if (typeof (instance as any).init === 'function') {
      await (instance as any).init()
    }
  }
}

export async function initClientCore() {
  setSingletons()

  // Register system processors
  registerSystemClient()

  await bootstraper()

  // Loaders
  playerClientLoader()

  const scanner = di.resolve(MetadataScanner)
  scanner.scan(clientControllerRegistry)
}
