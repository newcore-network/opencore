import { di } from './container'
import { playerSessionLoader } from './loaders/playerSession.loader'
import { PrincipalProviderContract } from './templates'
import { MetadataScanner } from '../system/metadata.scanner'
import { registerSystemServer } from './system/processors.register'
import { registerServicesServer } from './services/registers'
import { serverControllerRegistry } from './decorators'
import { loggers } from '../shared/logger'
import { AuthProviderContract } from './templates/auth/auth-provider.contract'

const check = () => {
  if (!di.isRegistered(PrincipalProviderContract as any)) {
    const errorMsg =
      'No Principal Provider configured. ' +
      "Please call 'Server.setPrincipalProvider(YourProvider)' before init(). This is required for authentication and authorization."
    loggers.bootstrap.fatal(errorMsg)
    throw new Error(`[OpenCore] CRITICAL: ${errorMsg}`)
  }

  if (!di.isRegistered(AuthProviderContract as any)) {
    const errorMsg =
      'No Authentication Provider configured. ' +
      "Please call 'Server.setAuthProvider(YourProvider)' before init(). This is required for authentication and authorization."
    loggers.bootstrap.fatal(errorMsg)
    throw new Error(`[OpenCore] CRITICAL: ${errorMsg}`)
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
export async function initServer() {
  loggers.bootstrap.info('Initializing OpenCore Server...')

  check()

  // Register core services
  registerServicesServer()
  loggers.bootstrap.debug('Core services registered')

  // Register system processors
  registerSystemServer()
  loggers.bootstrap.debug('System processors registered')

  // Extras
  playerSessionLoader()
  loggers.bootstrap.debug('Player session loader active')

  const scanner = di.resolve(MetadataScanner)
  scanner.scan(serverControllerRegistry)

  loggers.bootstrap.info('OpenCore Server initialized successfully')
}
