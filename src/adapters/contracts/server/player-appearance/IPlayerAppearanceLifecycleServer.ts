import type { PlayerAppearance } from '../../../../kernel/shared'

export interface ApplyPlayerAppearanceResult {
  success: boolean
  appearance?: PlayerAppearance
  errors?: string[]
}

export abstract class IPlayerAppearanceLifecycleServer {
  abstract apply(
    playerSrc: string,
    appearance: PlayerAppearance,
  ): Promise<ApplyPlayerAppearanceResult> | ApplyPlayerAppearanceResult

  abstract applyClothing(
    playerSrc: string,
    appearance: Pick<PlayerAppearance, 'components' | 'props'>,
  ): Promise<boolean> | boolean

  abstract reset(playerSrc: string): Promise<boolean> | boolean
}
