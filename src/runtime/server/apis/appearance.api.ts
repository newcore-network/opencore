import { injectable } from 'tsyringe'
import { inject } from 'tsyringe'
import { AppearanceService } from '../services'
import { IPlayerAppearanceLifecycleServer } from '../../../adapters/contracts/server/player-appearance/IPlayerAppearanceLifecycleServer'
import { AppearanceValidationResult, PlayerAppearance } from '../../..'
import { Player } from '../entities/player'

type PlayerRef = Player | number | string
type Clothes = Pick<PlayerAppearance, 'components' | 'props'>

@injectable()
export class Appearance {
  constructor(
    private readonly appearance: AppearanceService,
    @inject(IPlayerAppearanceLifecycleServer as any)
    private readonly lifecycle: IPlayerAppearanceLifecycleServer,
  ) {}

  /**
   * Apply full appearance to a player.
   *
   * This method:
   * - Resolves the player source automatically
   * - Validates appearance server-side
   * - Applies appearance securely
   * - Returns validated appearance for persistence
   */
  async apply(
    player: PlayerRef,
    appearance: PlayerAppearance,
  ): Promise<{ success: boolean; appearance?: PlayerAppearance; errors?: string[] }> {
    const validation = this.appearance.validateAppearance(appearance)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }
    const src = this.resolveSource(player)
    return this.lifecycle.apply(src, appearance)
  }

  /**
   * Apply only clothing (components + props).
   *
   * Useful for quick outfit swaps without touching face / tattoos.
   */
  async applyClothing(player: PlayerRef, appearance: Clothes): Promise<boolean> {
    const src = this.resolveSource(player)
    return await Promise.resolve(this.lifecycle.applyClothing(src, appearance))
  }

  /**
   * Reset player appearance to default.
   */
  async reset(player: PlayerRef): Promise<boolean> {
    const src = this.resolveSource(player)
    return await Promise.resolve(this.lifecycle.reset(src))
  }

  /**
   * Validate appearance data without applying it.
   *
   * Useful before persistence or preview flows.
   */
  validate(appearance: Partial<PlayerAppearance>): AppearanceValidationResult {
    return this.appearance.validateAppearance(appearance)
  }

  private resolveSource(player: PlayerRef): string {
    if (typeof player === 'string') return player
    if (typeof player === 'number') return String(player)
    return player.clientID.toString()
  }
}
