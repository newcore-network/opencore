import { InitClient } from './client-bootstrap';
import { di } from './client-container';
import { Spawner } from './services/spawn.service';

export const CoreClient = {
  Init: async () => {
    InitClient();
  },
  //Categories
  services: {
    get spawner() {
      return di.resolve(Spawner);
    },
  },
};
