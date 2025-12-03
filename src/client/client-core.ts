import { initClientCore } from './client-bootstrap'
import { di } from './client-container'
import { NuiBridge } from './ui-bridge'

// Services
import { Spawner } from './services/core'
import { NotificationService, TextUIService, ProgressService } from './services/ui'
import { MarkerService, BlipService, VehicleService, PedService } from './services/world'
import { StreamingService } from './services/streaming'

export async function init() {
  await initClientCore()
}

export const services = {
  // Core
  get spawner() {
    return di.resolve(Spawner)
  },

  // NUI
  get nui() {
    return di.resolve(NuiBridge)
  },

  // UI
  get notifications() {
    return di.resolve(NotificationService)
  },
  get textUI() {
    return di.resolve(TextUIService)
  },
  get progress() {
    return di.resolve(ProgressService)
  },

  // World
  get markers() {
    return di.resolve(MarkerService)
  },
  get blips() {
    return di.resolve(BlipService)
  },
  get vehicles() {
    return di.resolve(VehicleService)
  },
  get peds() {
    return di.resolve(PedService)
  },

  // Streaming
  get streaming() {
    return di.resolve(StreamingService)
  },
}
