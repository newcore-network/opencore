import { inject } from 'tsyringe'
import { PlayerAppearance } from '../../../kernel/shared'
import { Controller, OnNet } from '../decorators'
import { IClientLocalPlayerBridge } from '../adapter/local-player-bridge'
import { AppearanceService } from '../services/appearance.service'
import { loggers } from '../../../kernel/logger'

@Controller()
export class AppearanceTestClientController {
  constructor(
    @inject(AppearanceService as any) private readonly appearanceService: AppearanceService,
    @inject(IClientLocalPlayerBridge as any) private readonly localPlayer: IClientLocalPlayerBridge,
  ) {}
  @OnNet('opencore:appearance:apply')
  async onApply(appearance: PlayerAppearance): Promise<void> {
    loggers.netEvent.debug('appearance:apply received', {
      appearance,
    })
    const ped = this.localPlayer.getHandle()
    await this.appearanceService.applyAppearance(ped, appearance)
  }
  @OnNet('opencore:appearance:reset')
  onReset(): void {
    loggers.netEvent.debug('appearance:reset received')
    const ped = this.localPlayer.getHandle()
    this.appearanceService.setDefaultAppearance(ped)
    this.appearanceService.clearTattoos(ped)
  }
}
