import { inject } from 'tsyringe'
import { loggers } from '../../../kernel/logger'
import { emitFrameworkEvent } from '../bus/internal-event.bus'
import { Controller } from '../decorators'
import { OnRuntimeEvent } from '../decorators/onRuntimeEvent'
import { PlayerPersistenceService } from '../services/persistence.service'
import { PlayerSessionLifecyclePort } from '../ports/internal/player-session-lifecycle.port'
import { PlayerFullyConnectedPayload } from '../types/framework-events.types'
import { Players } from '../ports/player-directory'

@Controller()
export class SessionController {
  constructor(
    @inject(PlayerSessionLifecyclePort as any)
    private readonly playerSessionLifecycle: PlayerSessionLifecyclePort,
    @inject(Players as any)
    private readonly playerDirectory: Players,
    @inject(PlayerPersistenceService as any)
    private readonly persistance: PlayerPersistenceService,
  ) {}

  @OnRuntimeEvent('playerJoining')
  public async onPlayerJoining(
    clientId: number,
    identifiers?: Record<string, string>,
  ): Promise<void> {
    const player = this.playerSessionLifecycle.bind(clientId, {
      license: identifiers?.license,
      ...identifiers,
    })

    loggers.session.info(`Player session created`, {
      clientId,
      license: identifiers?.license ?? 'none',
    })

    await this.persistance.handleSessionLoad(player)

    emitFrameworkEvent('internal:playerSessionCreated', {
      clientId,
      license: identifiers?.license,
    })

    setImmediate(() => {
      const currentPlayer = this.playerDirectory.getByClient(clientId)
      if (!currentPlayer) return
      const payload: PlayerFullyConnectedPayload = { player: currentPlayer }
      emitFrameworkEvent('internal:playerFullyConnected', payload)
    })
  }

  @OnRuntimeEvent('playerDropped')
  public async onPlayerDropped(clientId: number): Promise<void> {
    const player = this.playerDirectory.getByClient(clientId)

    if (player) {
      await this.persistance.handleSessionSave(player)
    }

    this.playerSessionLifecycle.unbind(clientId)
    emitFrameworkEvent('internal:playerSessionDestroyed', { clientId })
    loggers.session.info(`Player session destroyed`, { clientId })
  }
}
