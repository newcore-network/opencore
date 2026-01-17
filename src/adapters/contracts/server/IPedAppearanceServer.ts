/**
 * Server-side ped appearance operations adapter.
 *
 * @remarks
 * Abstracts FiveM ped appearance natives for server-side operations.
 * Server-side has limited appearance control compared to client.
 *
 * Only components and props can be set from the server.
 * HeadBlend, face features, overlays, and tattoos must be applied client-side.
 */
export abstract class IPedAppearanceServer {
  /**
   * Sets a ped's component variation (clothing, hair, etc.).
   *
   * @param ped - Ped entity handle
   * @param componentId - Component ID (0-11)
   * @param drawable - Drawable index
   * @param texture - Texture index
   * @param palette - Palette ID (usually 2)
   */
  abstract setComponentVariation(
    ped: number,
    componentId: number,
    drawable: number,
    texture: number,
    palette: number,
  ): void

  /**
   * Sets a ped's prop (hat, glasses, etc.).
   *
   * @param ped - Ped entity handle
   * @param propId - Prop ID (0-7)
   * @param drawable - Drawable index
   * @param texture - Texture index
   * @param attach - Whether to attach the prop
   */
  abstract setPropIndex(
    ped: number,
    propId: number,
    drawable: number,
    texture: number,
    attach: boolean,
  ): void

  /**
   * Clears a ped's prop.
   *
   * @param ped - Ped entity handle
   * @param propId - Prop ID to clear (0-7)
   */
  abstract clearProp(ped: number, propId: number): void

  /**
   * Sets the ped to default component variation.
   *
   * @param ped - Ped entity handle
   */
  abstract setDefaultComponentVariation(ped: number): void
}
