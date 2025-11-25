
import { loadDecorators } from "./loader/decorators.loader";
import { playerSessionLoader } from "./loader/playerSession.loader";

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
export function initServerCore() {
  loadDecorators();
  playerSessionLoader();
}