import { initClientCore } from './client-bootstrap'
import { di } from './client-container'
import { Spawner } from './services/spawn.service'

export async function init() {
  await initClientCore()
}

export const services = {
  get spawner() {
    return di.resolve(Spawner)
  },
}
