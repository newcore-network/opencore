import { ApiClient } from './api/out/api.client'
import { initServerCore } from './bootstrap'
import { di } from './container'
import { PlayerManager } from './services/player'

export async function init() {
  await initServerCore()
}

export const services = {
  get playerManager() {
    return di.resolve(PlayerManager)
  },
  get apiClient() {
    return di.resolve(ApiClient)
  },
}
