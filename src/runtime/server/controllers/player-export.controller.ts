import { Controller } from '../decorators/controller'
import { Export } from '../decorators/export'
import { PlayerDirectoryPort } from '../services/ports/player-directory.port'

@Controller()
export class PlayerExportController {
  constructor(private playerService: PlayerDirectoryPort) {}

  @Export()
  getPlayerId(clientID: number): string | undefined {
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
