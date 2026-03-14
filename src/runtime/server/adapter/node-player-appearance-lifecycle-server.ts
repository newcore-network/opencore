import { inject, injectable } from 'tsyringe'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { IPedAppearanceServer } from '../../../adapters/contracts/server/IPedAppearanceServer'
import { IPlayerAppearanceLifecycleServer } from '../../../adapters/contracts/server/player-appearance/IPlayerAppearanceLifecycleServer'
import { IPlayerServer } from '../../../adapters/contracts/server/IPlayerServer'
import { AppearanceValidationResult, PlayerAppearance } from '../../../kernel/shared'

@injectable()
export class NodePlayerAppearanceLifecycleServer extends IPlayerAppearanceLifecycleServer {
  constructor(
    @inject(IPedAppearanceServer as any) private readonly pedAdapter: IPedAppearanceServer,
    @inject(IPlayerServer as any) private readonly playerServer: IPlayerServer,
    @inject(EventsAPI as any) private readonly events: EventsAPI<'server'>,
  ) {
    super()
  }

  async apply(
    playerSrc: string,
    appearance: PlayerAppearance,
  ): Promise<{ success: boolean; appearance?: PlayerAppearance; errors?: string[] }> {
    const ped = this.playerServer.getPed(playerSrc)
    if (ped === 0) {
      return { success: false, errors: ['Player ped not found'] }
    }

    this.applyServerSideAppearance(ped, appearance)
    this.events.emit('opencore:appearance:apply', parseInt(playerSrc, 10), appearance)
    return { success: true, appearance }
  }

  applyClothing(
    playerSrc: string,
    appearance: Pick<PlayerAppearance, 'components' | 'props'>,
  ): boolean {
    const ped = this.playerServer.getPed(playerSrc)
    if (ped === 0) return false
    this.applyServerSideAppearance(ped, appearance)
    return true
  }

  reset(playerSrc: string): boolean {
    const ped = this.playerServer.getPed(playerSrc)
    if (ped === 0) return false
    this.pedAdapter.setDefaultComponentVariation(ped)
    this.events.emit('opencore:appearance:reset', parseInt(playerSrc, 10))
    return true
  }

  private applyServerSideAppearance(
    ped: number,
    appearance: Pick<PlayerAppearance, 'components' | 'props'>,
  ): void {
    if (appearance.components) {
      for (const [componentId, data] of Object.entries(appearance.components)) {
        this.pedAdapter.setComponentVariation(ped, parseInt(componentId, 10), data.drawable, data.texture, 2)
      }
    }

    if (appearance.props) {
      for (const [propId, data] of Object.entries(appearance.props)) {
        if (data.drawable === -1) {
          this.pedAdapter.clearProp(ped, parseInt(propId, 10))
        } else {
          this.pedAdapter.setPropIndex(ped, parseInt(propId, 10), data.drawable, data.texture, true)
        }
      }
    }
  }
}
