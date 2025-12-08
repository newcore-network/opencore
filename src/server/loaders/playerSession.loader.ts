import { container } from 'tsyringe'
import { PlayerService } from '../services/player.service'
import { PlayerPersistenceService } from '../services/persistence.service'
import { emitCoreEvent } from '../bus/core-event-bus'
import { loggers } from '../../shared/logger'

export const playerSessionLoader = () => {
  const playerManager = container.resolve(PlayerService)
  const persistenceService = container.resolve(PlayerPersistenceService)

  // Initialize persistence service (resolves provider if configured)
  persistenceService.initialize()

  on('playerJoining', async () => {
    const clientId = source
    const license = GetPlayerIdentifier(clientId.toString(), 0) ?? undefined
    const player = playerManager.bind(clientId, { license })

    loggers.session.info(`Player session created`, {
      clientId,
      license: license ?? 'none',
    })

    // Load persisted data for the player
    await persistenceService.handleSessionLoad(player)

    emitCoreEvent('core:playerSessionCreated', {
      clientId,
      license,
    })

    setImmediate(() => {
      const currentPlayer = playerManager.getByClient(clientId)
      if (!currentPlayer) return

      emitCoreEvent('core:playerFullyConnected', {
        clientId,
        license,
      })
    })
  })

  on('playerDropped', async (source: string) => {
    const clientId = Number(source)
    const player = playerManager.getByClient(clientId)

    // Save player data before destroying session
    if (player) {
      await persistenceService.handleSessionSave(player)
    }

    playerManager.unbindByClient(clientId)
    emitCoreEvent('core:playerSessionDestroyed', { clientId })

    loggers.session.info(`Player session destroyed`, { clientId })
  })
}
