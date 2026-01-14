import { GLOBAL_CONTAINER } from '../../../kernel/di/index'
import { DatabaseService } from '../database'
import { RuntimeContext } from '../runtime'
import { ChatService } from './chat.service'
import { CommandService } from './core/command.service'
import { PlayerService } from './core/player.service'
import { LocalPrincipalService } from './core/principal.service'
import { SessionRecoveryService } from './core/session-recovery.service'
import { PlayerPersistenceService } from './persistence.service'
import { CommandExecutionPort } from './ports/command-execution.port'
import { PlayerDirectoryPort } from './ports/player-directory.port'
import { PlayerSessionLifecyclePort } from './ports/player-session-lifecycle.port'
import { PrincipalPort } from './ports/principal.port'
import { RemoteCommandService } from './remote/remote-command.service'
import { RemotePlayerService } from './remote/remote-player.service'
import { RemotePrincipalService } from './remote/remote-principal.service'

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
  }

  if (features.players.enabled) {
    if (features.players.provider === 'local' || mode === 'CORE') {
      GLOBAL_CONTAINER.registerSingleton(PlayerService)
      GLOBAL_CONTAINER.register(PlayerDirectoryPort as any, { useToken: PlayerService })
      GLOBAL_CONTAINER.register(PlayerSessionLifecyclePort as any, { useToken: PlayerService })
    } else {
      GLOBAL_CONTAINER.registerSingleton(PlayerDirectoryPort as any, RemotePlayerService)
    }
  }

  if (mode === 'RESOURCE' && features.players.enabled) {
    GLOBAL_CONTAINER.register(PlayerSessionLifecyclePort as any, {
      useFactory: () => {
        throw new Error('[OpenCore] PlayerSessionLifecyclePort is not available in RESOURCE mode')
      },
    })
  }

  if (features.sessionLifecycle.enabled && mode !== 'RESOURCE') {
    GLOBAL_CONTAINER.registerSingleton(PlayerPersistenceService, PlayerPersistenceService)
    GLOBAL_CONTAINER.registerSingleton(SessionRecoveryService, SessionRecoveryService)
  }

  if (features.principal.enabled) {
    if (features.principal.provider === 'local' || mode === 'CORE' || mode === 'STANDALONE') {
      // CORE/STANDALONE: Local principal service wraps user's PrincipalProviderContract
      GLOBAL_CONTAINER.registerSingleton(LocalPrincipalService)
      GLOBAL_CONTAINER.register(PrincipalPort as any, { useToken: LocalPrincipalService })
    } else {
      // RESOURCE: Remote principal service delegates to CORE
      GLOBAL_CONTAINER.registerSingleton(PrincipalPort as any, RemotePrincipalService)
    }
  }

  if (features.database.enabled) {
    GLOBAL_CONTAINER.registerSingleton(DatabaseService)
  }

  if (features.commands.enabled) {
    if (features.commands.provider === 'local' || mode === 'CORE') {
      // CORE/STANDALONE: local command execution
      GLOBAL_CONTAINER.registerSingleton(CommandService)
      GLOBAL_CONTAINER.register(CommandExecutionPort as any, { useToken: CommandService })
    } else {
      // RESOURCE: remote command execution (delegates to CORE)
      GLOBAL_CONTAINER.registerSingleton(CommandExecutionPort as any, RemoteCommandService)
    }
  }

  if (features.chat.enabled) {
    GLOBAL_CONTAINER.registerSingleton(ChatService)
  }
}
