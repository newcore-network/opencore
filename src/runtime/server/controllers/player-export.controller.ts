import { Controller } from '../decorators/controller'
import { Export } from '../decorators/export'
import { PlayerDirectoryContract } from '../services/contracts/player.service.contract'

@Controller()
export class PlayerExportController {
  constructor(private playerService: PlayerDirectoryContract) {}

  @Export()
  getPlayerId(clientID: number): string | null {
    return this.playerService.getPlayerId(clientID)
  }

  @Export()
  async getPlayerMeta(clientID: number, key: string): Promise<any> {
    return await this.playerService.getMeta(clientID, key)
  }

  @Export()
  setPlayerMeta(clientID: number, key: string, value: any): void {
    this.playerService.setMeta(clientID, key, value)
  }
}
