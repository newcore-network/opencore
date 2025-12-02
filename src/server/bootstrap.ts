import { di } from './container'
import { playerSessionLoader } from './loaders/playerSession.loader'
import { PrincipalProviderContract } from './templates'
import { MetadataScanner } from '../system/metadata.scanner'
import { registerSystemServer } from './system/processors.register'
import { registerServicesServer } from './services/registers'
import { serverControllerRegistry } from './decorators'

const check = () => {
  if (!di.isRegistered(PrincipalProviderContract as any)) {
    throw new Error(
      `[OpenCore] CRITICAL: No Authentication Provider configured. ` +
        `Please call 'Server.Setup.setAuthProvider(YourProvider)' before init().`,
    )
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
  check()
  // Register core services
  registerServicesServer()
  // Register system processors
  registerSystemServer()

  // Extras
  playerSessionLoader()

  const scanner = di.resolve(MetadataScanner)
  scanner.scan(serverControllerRegistry)
}
