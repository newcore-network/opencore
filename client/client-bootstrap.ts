import { di } from './client-container';
import { loadDecorators } from './loaders/decorators.loader';
import { playerClientLoader } from './player/player.loader';
import { Spawner } from './services/spawn.service';

const bootServices = [Spawner] as const;

/**
 * Basic setup for client, for configs, decorators, containers... etc
 */
function setSingletons() {
  di.registerSingleton(Spawner, Spawner);
}

async function bootstraper() {
  for (const Service of bootServices) {
    const instance = di.resolve(Service);
    if (typeof (instance as any).init === 'function') {
      await (instance as any).init();
    }
  }
}

export const InitClient = async () => {
  setSingletons();
  loadDecorators();
  await bootstraper();

  // Loaders
  playerClientLoader();
};
