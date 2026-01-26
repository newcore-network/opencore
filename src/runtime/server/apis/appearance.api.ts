import { injectable } from 'tsyringe'
import { AppearanceService } from '../services'
import { AppearanceValidationResult, PlayerAppearance } from '../../..'
import { Server } from '..'

type PlayerRef = Server.Player | number | string
type Clothes = Pick<PlayerAppearance, 'components' | 'props'>

@injectable()
export class Appearance {
  constructor(private readonly appearance: AppearanceService) {}

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
    const src = this.resolveSource(player)
    return this.appearance.applyAppearance(src, appearance)
  }

  /**
   * Apply only clothing (components + props).
   *
   * Useful for quick outfit swaps without touching face / tattoos.
   */
  applyClothing(player: PlayerRef, appearance: Clothes): boolean {
    const src = this.resolveSource(player)
    return this.appearance.applyClothing(src, appearance)
  }

  /**
   * Reset player appearance to default.
   */
  reset(player: PlayerRef): boolean {
    const src = this.resolveSource(player)
    return this.appearance.resetAppearance(src)
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
