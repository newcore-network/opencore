import { di } from '../../../kernel/di/container'
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

/**
 * Registers server runtime services in the dependency injection container.
 *
 * @remarks
 * This function enforces feature gating based on the runtime mode:
 * - In `RESOURCE` mode, some features require explicit grants (`resourceGrants`).
 * - Service bindings may resolve to local implementations (CORE mode) or remote proxies.
 *
 * @param ctx - Runtime context containing mode, feature flags, and optional resource grants.
 *
 * @throws Error - If a forbidden feature is enabled in `RESOURCE` mode without the corresponding grant.
 */
export function registerServicesServer(ctx: RuntimeContext) {
  const { mode, features, resourceGrants } = ctx

  if (mode === 'RESOURCE') {
    if (features.database.enabled && !resourceGrants?.database) {
      throw new Error(
        `[OpenCore] Feature 'database' is forbidden in RESOURCE mode unless resourceGrants.database=true`,
      )
    }
    if (features.principal.enabled && !resourceGrants?.principal) {
      throw new Error(
        `[OpenCore] Feature 'principal' is forbidden in RESOURCE mode unless resourceGrants.principal=true`,
      )
    }
    if (features.auth.enabled && !resourceGrants?.auth) {
      throw new Error(
        `[OpenCore] Feature 'auth' is forbidden in RESOURCE mode unless resourceGrants.auth=true`,
      )
    }
  }

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
