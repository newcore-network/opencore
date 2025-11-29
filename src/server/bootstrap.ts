import { di } from './container'
import { loadDecorators } from './loaders/decorators.loader'
import { exportsLoader } from './loaders/exports.loader'
import { playerSessionLoader } from './loaders/playerSession.loader'
import { CommandService } from './services/command.service'
import { HttpService } from './services/http/http.service'
import { PlayerService } from './services/player.service'

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
  // Register core services
  di.registerSingleton(PlayerService, PlayerService)
  di.registerSingleton(CommandService, CommandService)
  di.registerSingleton(HttpService, HttpService)

  loadDecorators()
  exportsLoader()
  playerSessionLoader()
}
