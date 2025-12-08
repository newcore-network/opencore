import { di } from '../container'
import { DatabaseService } from '../database'
import { ChatService } from './chat.service'
import { CommandService } from './command.service'
import { HttpService } from './http/http.service'
import { PlayerService } from './core/player.service'
import { PlayerPersistenceService } from './persistence.service'
import { PlayerServiceContract } from './contracts/player.service.contract'
import { RemotePlayerService } from './remote/remote-player.service'
import { PrincipalProviderContract } from '../templates'
import { RemotePrincipalProvider } from './remote/remote-principal.provider'

export function registerServicesServer(mode: 'CORE' | 'RESOURCE') {
  if (mode === 'CORE') {
    di.registerSingleton(PlayerServiceContract as any, PlayerService)
    di.registerSingleton(PlayerService, PlayerService)
    di.registerSingleton(PlayerPersistenceService, PlayerPersistenceService)
  } else {
    di.registerSingleton(PlayerServiceContract as any, RemotePlayerService)
    di.registerSingleton(PrincipalProviderContract as any, RemotePrincipalProvider)
  }

  di.registerSingleton(DatabaseService, DatabaseService)
  di.registerSingleton(CommandService, CommandService)
  di.registerSingleton(HttpService, HttpService)
  di.registerSingleton(ChatService, ChatService)
}
