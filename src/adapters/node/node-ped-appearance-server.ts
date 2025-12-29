import { IPedAppearanceServer } from '../contracts/IPedAppearanceServer'

/**
 * Node.js stub implementation of server-side ped appearance adapter.
 *
 * @remarks
 * This is a no-op implementation for testing in Node.js environment.
 * All methods do nothing.
 */
export class NodePedAppearanceServer extends IPedAppearanceServer {
  setComponentVariation(): void {}
  setPropIndex(): void {}
  clearProp(): void {}
  setDefaultComponentVariation(): void {}
}
