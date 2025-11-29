import { di } from './container'
import { loadDecorators } from './loader/decorators.loader'
import { exportsLoader } from './loader/exports.loader'
import { playerSessionLoader } from './loader/playerSession.loader'
import { CommandService } from './services/command.service'
import { HttpService } from './services/http/http.service'
import { PlayerService } from './services/player.service'

function setter() {
  di.registerSingleton(PlayerService, PlayerService)
  di.registerSingleton(CommandService, CommandService)
  di.registerSingleton(HttpService, HttpService)
  loadDecorators()
  exportsLoader()
}

/**
 * Initializes the server-side core of the framework.
 *
 * This function reads all collected metadata from decorators
 * (@Command, @NetEvent, @OnTick) and binds them to the actual
 * FiveM runtime functions (RegisterCommand, onNet, setTick).
 *
 * Every decorated method is resolved through the dependency
 * injection container (DI), ensuring controllers and services
 * are instantiated consistently and with proper dependencies.
 */
export async function initServerCore() {
  setter()
  playerSessionLoader()
}
