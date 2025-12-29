import { injectable } from 'tsyringe'
import type { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { coreLogger, LogDomain } from '../../../../kernel/shared/logger'
import { GameEventParsers } from '../../types/game-events'
import { METADATA_KEYS } from '../metadata-client.keys'

const clientGameEvent = coreLogger.child('GameEvent', LogDomain.CLIENT)

// Map of event names to their parser functions
const parserMap: Record<string, (args: number[]) => unknown> = {
  CEventNetworkEntityDamage: GameEventParsers.parseEntityDamage,
  CEventNetworkPlayerEnteredVehicle: GameEventParsers.parsePlayerEnteredVehicle,
  CEventNetworkPlayerLeftVehicle: GameEventParsers.parsePlayerLeftVehicle,
  CEventShockingSeenPedKilled: GameEventParsers.parseSeenPedKilled,
  CEventNetworkVehicleUndrivable: GameEventParsers.parseVehicleUndrivable,
  CEventGunShot: GameEventParsers.parseGunShot,
}

interface GameEventMetadata {
  eventName: string
  autoParse: boolean
}

@injectable()
export class GameEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.GAME_EVENT

  process(target: any, methodName: string, metadata: GameEventMetadata) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`
    const { eventName, autoParse } = metadata

    on('gameEventTriggered', async (name: string, args: number[]) => {
      if (name !== eventName) return

      try {
        // Auto-parse if enabled and parser exists
        if (autoParse && parserMap[eventName]) {
          const parsed = parserMap[eventName](args)
          await handler(parsed)
        } else {
          await handler(args)
        }
      } catch (error) {
        clientGameEvent.error(
          `Game event handler error`,
          {
            event: eventName,
            handler: handlerName,
          },
          error as Error,
        )
      }
    })

    clientGameEvent.debug(`Registered game event: ${eventName} -> ${handlerName}`)
  }
}
