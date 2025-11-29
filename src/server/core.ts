import { ApiClient } from './api/out/api.client'
import { initServerCore } from './bootstrap'
import { di } from './container'
import { PlayerService } from './services/player.service'

export async function init() {
  await initServerCore()
}

// Puerta de acceso a servicios del Core desde código que NO puede usar inyección por constructor
// callbacks de Cfx, funciones sueltas, helpers estáticos, etc. !!!!!! - Recordatorio para mi mismo
// Borrar después para docs oficiales
// Cualquier servicio core singleton, infra o runtime, compartido por todo el servidor.
//
// NO en Server.services:
//
// - Services de módulos de gameplay (BankingService, InventoryService, etc.).
// - Repositorios de módulos.
// - Cosas muy específicas de un módulo.
//
// SOLO SE USARÁ EN:
// - Handlers registrados por función.
// - Wrappers estáticos alrededor de APIs Cfx.
// - Código “pegao” donde DI no entra bien.
export const services = {
  get playerManager() {
    return di.resolve(PlayerService)
  },
  get apiClient() {
    return di.resolve(ApiClient)
  },
}
