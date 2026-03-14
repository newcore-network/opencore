import { inject } from 'tsyringe'
import { PlayerAppearance } from '../../../kernel/shared'
import { Controller, OnNet } from '../decorators'
import { IClientPlatformBridge } from '../adapter/platform-bridge'
import { AppearanceService } from '../services/appearance.service'
import { loggers } from '../../../kernel/logger'

@Controller()
export class AppearanceTestClientController {
  constructor(
    @inject(AppearanceService as any) private readonly appearanceService: AppearanceService,
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
  ) {}
  @OnNet('opencore:appearance:apply')
  async onApply(appearance: PlayerAppearance): Promise<void> {
    loggers.netEvent.debug('appearance:apply received', {
      appearance,
    })
    const ped = this.platform.getLocalPlayerPed()
    await this.appearanceService.applyAppearance(ped, appearance)
  }
  @OnNet('opencore:appearance:reset')
  onReset(): void {
    loggers.netEvent.debug('appearance:reset received')
    const ped = this.platform.getLocalPlayerPed()
    this.appearanceService.setDefaultAppearance(ped)
    this.appearanceService.clearTattoos(ped)
  }
}
