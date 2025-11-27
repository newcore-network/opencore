import { initServerCore } from './bootstrap';

export const CoreServer = {
  Init: async () => {
    await initServerCore();
  },
  //Categories
  services: {},
};
