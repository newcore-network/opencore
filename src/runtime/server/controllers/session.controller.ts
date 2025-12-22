import { loggers } from '../../../kernel/shared'
import { emitFrameworkEvent } from '../bus/core-event-bus'
import { Controller } from '../decorators'
import { OnFiveMEvent } from '../decorators/onFiveMEvent'
import { PlayerService } from '../services'
import { PlayerPersistenceService } from '../services/persistence.service'

@Controller()
export class SessionController {
  constructor(
    private readonly playerService: PlayerService,
    private readonly persistance: PlayerPersistenceService,
  ) {}

  @OnFiveMEvent('playerJoining')
  public async onPlayerJoining(): Promise<void> {
    const clientId = source
    const license = GetPlayerIdentifier(clientId.toString(), 0) ?? undefined
    const player = this.playerService.bind(clientId, { license })

    loggers.session.info(`Player session created`, {
      clientId,
      license: license ?? 'none',
    })

    await this.persistance.handleSessionLoad(player)

    emitFrameworkEvent('core:playerSessionCreated', { clientId, license })

    setImmediate(() => {
      const currentPlayer = this.playerService.getByClient(clientId)
      if (!currentPlayer) return
      emitFrameworkEvent('core:playerFullyConnected', { clientId, license })
    })
  }

  @OnFiveMEvent('playerDropped')
  public async onPlayerDropped(): Promise<void> {
    const clientId = Number(source)
    const player = this.playerService.getByClient(clientId)

    if (player) {
      await this.persistance.handleSessionSave(player)
    }

    this.playerService.unbindByClient(clientId)
    emitFrameworkEvent('core:playerSessionDestroyed', { clientId })
    loggers.session.info(`Player session destroyed`, { clientId })
  }
}
