import { inject } from 'tsyringe'
import { Controller, OnNet } from '../decorators'
import { AppearanceService } from '../services/appearance.service'
import { PlayerAppearance } from '../../../kernel/shared'

@Controller()
export class AppearanceTestClientController {
  constructor(
    @inject(AppearanceService as any) private readonly appearanceService: AppearanceService,
  ) {}
  @OnNet('opencore:appearance:apply')
  async onApply(appearance: PlayerAppearance): Promise<void> {
    const ped = PlayerPedId()
    await this.appearanceService.applyAppearance(ped, appearance)
  }
  @OnNet('opencore:appearance:reset')
  onReset(): void {
    const ped = PlayerPedId()
    this.appearanceService.setDefaultAppearance(ped)
    this.appearanceService.clearTattoos(ped)
  }
}
