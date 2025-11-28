import { InitClient } from './client-bootstrap'
import { di } from './client-container'
import { Spawner } from './services/spawn.service'

export async function init() {
  await InitClient()
}

export const services = {
  services: {
    get spawner() {
      return di.resolve(Spawner)
    },
  },
}
