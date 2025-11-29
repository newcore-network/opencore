import { container } from 'tsyringe'
import { PlayerManager } from '../services/player'
import { emitCoreEvent } from '../bus/core-event-bus'

export const playerSessionLoader = () => {
  const playerManager = container.resolve(PlayerManager)

  on('playerJoining', (source: string) => {
    const clientId = Number(source)
    const license = GetPlayerIdentifier(clientId.toString(), 0) ?? undefined
    playerManager.bind(clientId, { license })

    console.log(
      `[CORE] Binding player session for client ${clientId} with license ${license ?? 'none'}`,
    )

    emitCoreEvent('core:playerSessionCreated', {
      clientId,
      license,
    })
  })

  on('playerDropped', () => {
    const clientId = Number(global.source)
    playerManager.unbindByClient(clientId)
    emitCoreEvent('core:playerSessionDestroyed', { clientId })
    console.log(`[CORE] Player session destroyed for client ${clientId}`)
  })
}
