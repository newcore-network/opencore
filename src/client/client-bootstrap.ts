import { MetadataScanner } from '../system/metadata.scanner'
import { di } from './client-container'
import { clientControllerRegistry } from './decorators'
import { playerClientLoader } from './player/player.loader'
import { Spawner } from './services/spawn.service'

const bootServices = [Spawner] as const

/**
 * Basic setup for client, for configs, decorators, containers... etc
 */
function setSingletons() {
  di.registerSingleton(Spawner, Spawner)
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
  await bootstraper()

  // Loaders
  playerClientLoader()

  const scanner = di.resolve(MetadataScanner)
  scanner.scan(clientControllerRegistry)
}
