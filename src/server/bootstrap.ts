import { di } from './container'
import { PrincipalProviderContract } from './templates'
import { MetadataScanner } from '../system/metadata.scanner'
import { registerSystemServer } from './system/processors.register'
import { registerServicesServer } from './services/services.register'
import { loggers } from '../shared/logger'
import { AuthProviderContract } from './templates/auth/auth-provider.contract'
import { getServerControllerRegistry } from './decorators/controller'
import {
  getFrameworkModeScope,
  setRuntimeContext,
  type RuntimeContext,
  type ServerRuntimeOptions,
  validateRuntimeContextOrThrow,
} from './runtime'
import {
  registerDefaultBootstrapValidators,
  runBootstrapValidatorsOrThrow,
} from './bootstrap.validation'

function checkProviders(ctx: RuntimeContext): void {
  if (ctx.mode === 'RESOURCE') return

  if (ctx.features.principal.enabled && ctx.features.principal.required) {
    if (!di.isRegistered(PrincipalProviderContract as any)) {
      const errorMsg =
        'No Principal Provider configured. ' +
        "Please call 'Server.setPrincipalProvider(YourProvider)' before init(). This is required for authorization."
      loggers.bootstrap.fatal(errorMsg)
      throw new Error(`[OpenCore] CRITICAL: ${errorMsg}`)
    }
  }

  if (ctx.features.auth.enabled && ctx.features.auth.required) {
    if (!di.isRegistered(AuthProviderContract as any)) {
      const errorMsg =
        'No Authentication Provider configured. ' +
        "Please call 'Server.setAuthProvider(YourProvider)' before init(). This is required for authentication."
      loggers.bootstrap.fatal(errorMsg)
      throw new Error(`[OpenCore] CRITICAL: ${errorMsg}`)
    }
  }
}

async function loadFrameworkControllers(ctx: RuntimeContext): Promise<void> {
  if (ctx.features.commands.enabled) {
    await import('./controllers/command.controller')
  }

  if (ctx.features.chat.enabled && ctx.features.chat.export && ctx.features.exports.enabled) {
    if (ctx.mode !== 'RESOURCE') {
      await import('./controllers/chat.controller')
    }
  }

  if (ctx.features.sessionLifecycle.enabled && ctx.mode !== 'RESOURCE') {
    await import('./controllers/session.controller')
  }

  if (ctx.features.players.enabled && ctx.features.players.export && ctx.features.exports.enabled) {
    await import('./controllers/player-export.controller')
  }

  if (
    ctx.features.principal.enabled &&
    ctx.features.principal.export &&
    ctx.features.exports.enabled
  ) {
    await import('./controllers/principal-export.controller')
  }
}

/**
 * Bootstraps the OpenCore Server Application Context.
 *
 * This is the primary entry point for the server-side framework. It orchestrates the
 * initialization of the Dependency Injection (DI) container and establishes the
 * bridge between the low-level FiveM runtime and the OpenCore architecture.
 *
 * **Initialization Lifecycle:**
 * 1. **Infrastructure Registration:** Registers core infrastructure services (`PlayerService`, `CommandService`, `HttpService`) as Singletons in the IoC container.
 * 2. **Reflection & Discovery:** Scans all decorated classes (Controllers, Services) to extract metadata defined by `@Command`, `@OnNet`, etc.
 * 3. **Runtime Binding:** Binds the discovered metadata to actual FiveM natives (e.g., `RegisterCommand`, `onNet`, `exports`).
 * 4. **Session Management:** Activates the player session tracking system.
 *
 * @returns A promise that resolves when the Core is fully initialized and ready to process events.
 */
export async function initServer(options: ServerRuntimeOptions) {
  validateRuntimeContextOrThrow(options)
  setRuntimeContext(options)

  const ctx: RuntimeContext = options
  loggers.bootstrap.info('Initializing OpenCore Server...')

  loggers.bootstrap.debug('Runtime configuration', {
    mode: ctx.mode,
    scope: getFrameworkModeScope(ctx.mode),
  })

  registerServicesServer(ctx)
  loggers.bootstrap.debug('Core services registered')

  registerSystemServer(ctx)
  loggers.bootstrap.debug('System processors registered')

  checkProviders(ctx)

  await loadFrameworkControllers(ctx)

  if (ctx.features.database.enabled) {
    registerDefaultBootstrapValidators()
    await runBootstrapValidatorsOrThrow()
  }

  const scanner = di.resolve(MetadataScanner)
  scanner.scan(getServerControllerRegistry())
  loggers.bootstrap.info('OpenCore Server initialized successfully')
}
