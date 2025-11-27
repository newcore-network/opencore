import { di } from './client-container';
import { loadDecoradors } from './loaders/decorators.loader';
import { playerClientLoader } from './player/player.loader';
import { Spawner } from './services/spawn.service';

const bootServices = [Spawner] as const;

/**
 * Basic setup for client, for configs, decorators, containers... etc
 */
function setter() {
  di.registerSingleton(Spawner, Spawner);
  loadDecoradors();
}

async function bootstraper() {
  for (const Service of bootServices) {
    const instance = di.resolve(Service);
    if (typeof (instance as any).init === 'function') {
      await (instance as any).init();
    }
  }

  // Loaders
  playerClientLoader();
}

export const InitClient = async () => {
  setter();
  await bootstraper();
};
