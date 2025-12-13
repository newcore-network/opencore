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
import type { RuntimeContext } from '../runtime'

export function registerServicesServer(ctx: RuntimeContext) {
  const { mode, features } = ctx

  if (features.players.enabled) {
    if (features.players.provider === 'local' || mode === 'CORE') {
      di.registerSingleton(PlayerServiceContract as any, PlayerService)
      di.registerSingleton(PlayerService, PlayerService)
    } else {
      di.registerSingleton(PlayerServiceContract as any, RemotePlayerService)
    }
  }

  if (features.sessionLifecycle.enabled && mode !== 'RESOURCE') {
    di.registerSingleton(PlayerPersistenceService, PlayerPersistenceService)
  }

  if (features.principal.enabled) {
    if (features.principal.provider === 'core' && mode === 'RESOURCE') {
      di.registerSingleton(PrincipalProviderContract as any, RemotePrincipalProvider)
    }
  }

  if (features.auth.enabled && features.auth.provider === 'core' && mode === 'RESOURCE') {
    throw new Error(
      "[OpenCore] Feature 'auth' with provider='core' in RESOURCE mode is not implemented yet (missing RemoteAuthProvider).",
    )
  }

  if (features.database.enabled) {
    di.registerSingleton(DatabaseService, DatabaseService)
  }
  if (features.commands.enabled) {
    di.registerSingleton(CommandService, CommandService)
  }
  if (features.http.enabled) {
    di.registerSingleton(HttpService, HttpService)
  }
  if (features.chat.enabled) {
    di.registerSingleton(ChatService, ChatService)
  }
}
