import { loggers } from '../../../kernel/shared'
import { emitFrameworkEvent } from '../bus/core-event-bus'
import { Controller } from '../decorators'
import { OnFiveMEvent } from '../decorators/onFiveMEvent'
import { PlayerDirectoryPort } from '../services'
import { PlayerPersistenceService } from '../services/persistence.service'
import { PlayerSessionLifecyclePort } from '../services/ports/player-session-lifecycle.port'

@Controller()
export class SessionController {
  constructor(
    private readonly playerSessionLifecycle: PlayerSessionLifecyclePort,
    private readonly playerDirectory: PlayerDirectoryPort,
    private readonly persistance: PlayerPersistenceService,
  ) {}

  @OnFiveMEvent('playerJoining')
  public async onPlayerJoining(): Promise<void> {
    const clientId = Number(source)
    const license = GetPlayerIdentifier(clientId.toString(), 0) ?? undefined
    const player = this.playerSessionLifecycle.bind(clientId, { license })

    loggers.session.info(`Player session created`, {
      clientId,
      license: license ?? 'none',
    })

    await this.persistance.handleSessionLoad(player)

    emitFrameworkEvent('core:playerSessionCreated', { clientId, license })

    setImmediate(() => {
      const currentPlayer = this.playerDirectory.getByClient(clientId)
      if (!currentPlayer) return
      emitFrameworkEvent('core:playerFullyConnected', { clientId, license })
    })
  }

  @OnFiveMEvent('playerDropped')
  public async onPlayerDropped(): Promise<void> {
    const clientId = Number(source)
    const player = this.playerDirectory.getByClient(clientId)

    if (player) {
      await this.persistance.handleSessionSave(player)
    }

    this.playerSessionLifecycle.unbind(clientId)
    emitFrameworkEvent('core:playerSessionDestroyed', { clientId })
    loggers.session.info(`Player session destroyed`, { clientId })
  }
}
