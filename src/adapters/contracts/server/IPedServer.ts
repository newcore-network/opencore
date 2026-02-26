/**
 * Server-side ped operations adapter.
 *
 * @remarks
 * Provides a platform-agnostic contract to spawn and manage NPC peds.
 */
export abstract class IPedServer {
  /**
   * Creates a server-side ped.
   *
   * @param pedType - Platform ped type.
   * @param modelHash - Ped model hash.
   * @param x - X world position.
   * @param y - Y world position.
   * @param z - Z world position.
   * @param heading - Heading in degrees.
   * @param networked - Whether the ped should be networked.
   * @returns Entity handle or 0 on failure.
   */
  abstract create(
    pedType: number,
    modelHash: number,
    x: number,
    y: number,
    z: number,
    heading: number,
    networked: boolean,
  ): number

  /** Deletes a ped entity. */
  abstract delete(handle: number): void

  /** Returns the network id for an entity handle. */
  abstract getNetworkIdFromEntity(handle: number): number

  /** Returns the entity handle for a network id. */
  abstract getEntityFromNetworkId(networkId: number): number

  /** Checks whether a network id is currently valid. */
  abstract networkIdExists(networkId: number): boolean
}
