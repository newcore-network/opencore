import type { Vector3 } from '../../kernel/utils'

/**
 * Server-side vehicle operations adapter.
 *
 * @remarks
 * Abstracts FiveM vehicle natives for server-side operations.
 * Allows the runtime to work without direct FiveM dependencies.
 */
export abstract class IVehicleServer {
  /**
   * Creates a vehicle using server setter (server-authoritative).
   *
   * @param modelHash - Vehicle model hash
   * @param vehicleType - Vehicle type string
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @param heading - Vehicle heading
   * @returns Entity handle or 0 on failure
   */
  abstract createServerSetter(
    modelHash: number,
    vehicleType: string,
    x: number,
    y: number,
    z: number,
    heading: number,
  ): number

  /**
   * Gets vehicle colors.
   * @returns [primaryColor, secondaryColor]
   */
  abstract getColours(handle: number): [number, number]

  /**
   * Sets vehicle colors.
   */
  abstract setColours(handle: number, primary: number, secondary: number): void

  /**
   * Gets vehicle number plate text.
   */
  abstract getNumberPlateText(handle: number): string

  /**
   * Sets vehicle number plate text.
   */
  abstract setNumberPlateText(handle: number, text: string): void

  /**
   * Sets vehicle doors locked state.
   * @param state - 0 = unlocked, 1 = unlocked, 2 = locked, 3 = locked for player, 4 = locked for non-players
   */
  abstract setDoorsLocked(handle: number, state: number): void

  /**
   * Gets network ID from entity handle.
   */
  abstract getNetworkIdFromEntity(handle: number): number

  /**
   * Gets entity handle from network ID.
   */
  abstract getEntityFromNetworkId(networkId: number): number

  /**
   * Checks if network ID exists.
   */
  abstract networkIdExists(networkId: number): boolean
}
