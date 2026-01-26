import { GLOBAL_CONTAINER } from '../../../kernel/di/index'
import { WorldContext } from '../../core/world'
import { PrincipalProviderContract } from '../contracts/security/principal-provider.contract'
import { RuntimeContext } from '../runtime'
import { BinaryProcessManager } from '../system/managers/binary-process.manager'
import { Channels } from '../apis/channel.api'
import { Chat } from '../apis'
import { LocalCommandImplementation } from '../implementations/local/command.local'
import { LocalPlayerImplementation } from '../implementations/local/player.local'
import { LocalPrincipalService } from '../implementations/local/principal.local'
import { SessionRecoveryService } from './session-recovery.local'
import { DefaultPrincipalProvider } from '../default/default-principal.provider'
import { PlayerPersistenceService } from './persistence.service'
import { CommandExecutionPort } from '../ports/internal/command-execution.port'
import { Players } from '../ports/player-directory'
import { PlayerSessionLifecyclePort } from '../ports/internal/player-session-lifecycle.port'
import { Principal } from '../ports/principal.port'
import { RemoteCommandImplementation } from '../implementations/remote/command.remote'
import { RemotePlayerImplementation } from '../implementations/remote/player.remote'
import { RemotePrincipalImplementation } from '../implementations/remote/principal.remote'
import { RemoteChannelImplementation } from '../implementations/remote/channel.remote'

/**
 * Registers server runtime services in the dependency injection container.
 *
 * @remarks
 * This function handles service bindings based on the runtime mode:
 * - Service bindings may resolve to local implementations (CORE mode) or remote proxies.
 *
 * @param ctx - Runtime context containing mode and feature flags.
 */
export function registerServicesServer(ctx: RuntimeContext) {
  const { mode, features } = ctx

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: Register all service types FIRST (recipes only)
  // ═══════════════════════════════════════════════════════════════

  // WorldContext must be registered first as it has no dependencies
  if (!GLOBAL_CONTAINER.isRegistered(WorldContext)) {
    GLOBAL_CONTAINER.registerSingleton(WorldContext)
  }

  if (features.players.enabled) {
    if (features.players.provider === 'local' || mode === 'CORE') {
      GLOBAL_CONTAINER.registerSingleton(LocalPlayerImplementation)
      GLOBAL_CONTAINER.register(Players as any, { useToken: LocalPlayerImplementation })
      GLOBAL_CONTAINER.register(PlayerSessionLifecyclePort as any, {
        useToken: LocalPlayerImplementation,
      })
    } else {
      GLOBAL_CONTAINER.registerSingleton(Players as any, RemotePlayerImplementation)
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
      if (!GLOBAL_CONTAINER.isRegistered(PrincipalProviderContract as any)) {
        GLOBAL_CONTAINER.registerSingleton(
          PrincipalProviderContract as any,
          DefaultPrincipalProvider,
        )
      }
      GLOBAL_CONTAINER.registerSingleton(LocalPrincipalService)
      GLOBAL_CONTAINER.register(Principal as any, { useToken: LocalPrincipalService })
    } else {
      // RESOURCE: Remote principal service delegates to CORE
      GLOBAL_CONTAINER.registerSingleton(Principal as any, RemotePrincipalImplementation)
    }
  }

  if (features.commands.enabled) {
    if (features.commands.provider === 'local' || mode === 'CORE') {
      // CORE/STANDALONE: local command execution
      GLOBAL_CONTAINER.registerSingleton(LocalCommandImplementation)
      GLOBAL_CONTAINER.register(CommandExecutionPort as any, {
        useToken: LocalCommandImplementation,
      })
    } else {
      // RESOURCE: remote command execution (delegates to CORE)
      GLOBAL_CONTAINER.registerSingleton(CommandExecutionPort as any, RemoteCommandImplementation)
    }
  }

  if (features.chat.enabled) {
    if (mode === 'RESOURCE') {
      // RESOURCE: remote channel management (delegates to CORE)
      GLOBAL_CONTAINER.registerSingleton(Channels, RemoteChannelImplementation)
    } else {
      // CORE/STANDALONE: local channel management
      GLOBAL_CONTAINER.registerSingleton(Channels)
    }
    GLOBAL_CONTAINER.registerSingleton(Chat)
  }

  if (!GLOBAL_CONTAINER.isRegistered(BinaryProcessManager)) {
    GLOBAL_CONTAINER.registerSingleton(BinaryProcessManager)
  }
}
