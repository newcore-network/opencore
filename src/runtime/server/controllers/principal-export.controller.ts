import { Controller } from '../decorators'
import { Export } from '../decorators/export'
import { PlayerDirectoryContract } from '../services/contracts/player.service.contract'
import { PrincipalProviderContract } from '../templates'

@Controller()
export class PrincipalExportController {
  constructor(
    private readonly playerService: PlayerDirectoryContract,
    private readonly principalProvider: PrincipalProviderContract,
  ) {}

  @Export()
  async getPrincipal(source: number) {
    const player = this.playerService.getByClient(source)
    if (!player) return null
    return await this.principalProvider.getPrincipal(player)
  }
}
