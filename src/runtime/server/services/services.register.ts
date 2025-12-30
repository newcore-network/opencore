import { di } from '../../../kernel/di/index'
import { DatabaseService } from '../database'
import { RuntimeContext } from '../runtime'
import { ChatService } from './chat.service'
import { CommandService } from './core/command.service'
import { PlayerService } from './core/player.service'
import { LocalPrincipalService } from './core/principal.service'
import { HttpService } from './http/http.service'
import { PlayerPersistenceService } from './persistence.service'
import { PlayerSessionLifecyclePort } from './ports/player-session-lifecycle.port'
import { PlayerDirectoryPort } from './ports/player-directory.port'
import { PrincipalPort } from './ports/principal.port'
import { RemoteCommandService } from './remote/remote-command.service'
import { RemotePlayerService } from './remote/remote-player.service'
import { RemotePrincipalService } from './remote/remote-principal.service'
import { CommandExecutionPort } from './ports/command-execution.port'

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
      di.registerSingleton(PlayerService)
      di.register(PlayerDirectoryPort as any, { useToken: PlayerService })
      di.register(PlayerSessionLifecyclePort as any, { useToken: PlayerService })
    } else {
      di.registerSingleton(PlayerDirectoryPort as any, RemotePlayerService)
    }
  }

  if (mode === 'RESOURCE' && features.players.enabled) {
    di.register(PlayerSessionLifecyclePort as any, {
      useFactory: () => {
        throw new Error('[OpenCore] PlayerSessionLifecyclePort is not available in RESOURCE mode')
      },
    })
  }

  if (features.sessionLifecycle.enabled && mode !== 'RESOURCE') {
    di.registerSingleton(PlayerPersistenceService, PlayerPersistenceService)
  }

  if (features.principal.enabled) {
    if (features.principal.provider === 'local' || mode === 'CORE' || mode === 'STANDALONE') {
      // CORE/STANDALONE: Local principal service wraps user's PrincipalProviderContract
      di.registerSingleton(LocalPrincipalService)
      di.register(PrincipalPort as any, { useToken: LocalPrincipalService })
    } else {
      // RESOURCE: Remote principal service delegates to CORE
      di.registerSingleton(PrincipalPort as any, RemotePrincipalService)
    }
  }

  if (features.auth.enabled && features.auth.provider === 'core' && mode === 'RESOURCE') {
    throw new Error(
      "[OpenCore] Feature 'auth' with provider='core' in RESOURCE mode is not implemented yet (missing RemoteAuthProvider).",
    )
  }

  if (features.database.enabled) {
    di.registerSingleton(DatabaseService)
  }

  if (features.commands.enabled) {
    if (features.commands.provider === 'local' || mode === 'CORE') {
      // CORE/STANDALONE: local command execution
      di.registerSingleton(CommandService)
      di.register(CommandExecutionPort as any, { useToken: CommandService })
    } else {
      // RESOURCE: remote command execution (delegates to CORE)
      di.registerSingleton(CommandExecutionPort as any, RemoteCommandService)
    }
  }

  if (features.http.enabled) {
    di.registerSingleton(HttpService)
  }
  if (features.chat.enabled) {
    di.registerSingleton(ChatService)
  }
}
