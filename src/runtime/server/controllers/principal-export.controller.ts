import { PrincipalProviderContract } from '../contracts'
import { Controller } from '../decorators'
import { Export } from '../decorators/export'
import { PlayerDirectoryPort } from '../services/ports/player-directory.port'

@Controller()
export class PrincipalExportController {
  constructor(
    private readonly playerService: PlayerDirectoryPort,
    private readonly principalProvider: PrincipalProviderContract,
  ) {}

  @Export()
  async getPrincipal(source: number) {
    const player = this.playerService.getByClient(source)
    if (!player) return null
    return await this.principalProvider.getPrincipal(player)
  }
}
