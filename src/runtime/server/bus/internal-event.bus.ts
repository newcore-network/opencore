import { loggers } from '../../../kernel/logger'
import { IEngineEvents } from '../../../adapters/contracts/IEngineEvents'
import { SYSTEM_EVENTS } from '../../shared/types/system-types'
import { type FrameworkMode } from '../runtime'
import { Players } from '../ports/players.api-port'
import {
  type FrameworkEventEnvelope,
  type FrameworkEventsMap,
  type FrameworkTransportEventsMap,
  type PlayerFullyConnectedPayload,
  type PlayerFullyConnectedTransportPayload,
  type PlayerSessionRecoveredPayload,
  type PlayerSessionRecoveredTransportPayload,
} from '../types/framework-events.types'

type InternalEventName = keyof FrameworkEventsMap
type InternalEventHandler<E extends InternalEventName> = (payload: FrameworkEventsMap[E]) => void

type InternalTransportEventName = keyof FrameworkTransportEventsMap

interface FrameworkEventBridgeConfig {
  mode: FrameworkMode
  engineEvents?: IEngineEvents
  players?: Players
}

const handlers: Partial<Record<InternalEventName, InternalEventHandler<any>[]>> = {}
const bridgeListenerRegistrations = new WeakSet<IEngineEvents>()

let bridgeConfig: FrameworkEventBridgeConfig = {
  mode: 'STANDALONE',
}

export function onFrameworkEvent<E extends InternalEventName>(
  event: E,
  handler: InternalEventHandler<E>,
): () => void {
  let list = handlers[event] as InternalEventHandler<E>[] | undefined
  if (!list) {
    list = [] as InternalEventHandler<E>[]
    handlers[event] = list as InternalEventHandler<any>[]
  }
  list.push(handler)

  return () => {
    const index = list.indexOf(handler)
    if (index !== -1) list.splice(index, 1)
  }
}

export function configureFrameworkEventBridge(config: FrameworkEventBridgeConfig): void {
  bridgeConfig = config

  if (config.mode !== 'RESOURCE' || !config.engineEvents) return
  if (bridgeListenerRegistrations.has(config.engineEvents)) return

  config.engineEvents.on(
    SYSTEM_EVENTS.framework.dispatch,
    (envelope: FrameworkEventEnvelope<InternalTransportEventName>) => {
      if (bridgeConfig.mode !== 'RESOURCE') return
      dispatchTransportFrameworkEvent(envelope.event, envelope.payload)
    },
  )

  bridgeListenerRegistrations.add(config.engineEvents)
}

export function emitFrameworkEvent<E extends InternalEventName>(
  event: E,
  payload: FrameworkEventsMap[E],
) {
  dispatchLocalFrameworkEvent(event, payload)

  if (bridgeConfig.mode !== 'CORE' || !bridgeConfig.engineEvents) return

  const transportPayload = serializeFrameworkEvent(event, payload)
  if (!transportPayload) return

  bridgeConfig.engineEvents.emit(SYSTEM_EVENTS.framework.dispatch, {
    event,
    payload: transportPayload,
  })
}

function dispatchLocalFrameworkEvent<E extends InternalEventName>(
  event: E,
  payload: FrameworkEventsMap[E],
) {
  const list = handlers[event] as InternalEventHandler<E>[] | undefined
  if (!list) return

  for (const handler of list) {
    try {
      handler(payload)
    } catch (error) {
      loggers.eventBus.error(
        `Handler error for event`,
        {
          event,
        },
        error as Error,
      )
    }
  }
}

function dispatchTransportFrameworkEvent<E extends InternalTransportEventName>(
  event: E,
  payload: FrameworkTransportEventsMap[E],
): void {
  const hydrated = hydrateFrameworkEvent(event, payload)
  if (!hydrated) return
  dispatchLocalFrameworkEvent(event, hydrated)
}

function serializeFrameworkEvent<E extends InternalEventName>(
  event: E,
  payload: FrameworkEventsMap[E],
): FrameworkTransportEventsMap[E] | null {
  switch (event) {
    case 'internal:playerSessionCreated':
    case 'internal:playerSessionDestroyed':
      return payload as FrameworkTransportEventsMap[E]
    case 'internal:playerFullyConnected': {
      const fullyConnectedPayload = payload as PlayerFullyConnectedPayload
      return {
        clientId: fullyConnectedPayload.player.clientID,
      } as FrameworkTransportEventsMap[E]
    }
    case 'internal:playerSessionRecovered': {
      const recoveredPayload = payload as PlayerSessionRecoveredPayload
      return {
        clientId: recoveredPayload.clientId,
        license: recoveredPayload.license,
      } as FrameworkTransportEventsMap[E]
    }
    default:
      return null
  }
}

function hydrateFrameworkEvent<E extends InternalTransportEventName>(
  event: E,
  payload: FrameworkTransportEventsMap[E],
): FrameworkEventsMap[E] | null {
  switch (event) {
    case 'internal:playerSessionCreated':
    case 'internal:playerSessionDestroyed':
      return payload as FrameworkEventsMap[E]
    case 'internal:playerFullyConnected': {
      const fullyConnectedPayload = payload as PlayerFullyConnectedTransportPayload
      const player = bridgeConfig.players?.getByClient(fullyConnectedPayload.clientId)
      if (!player) {
        loggers.eventBus.warn('Skipping framework event: player not found during hydration', {
          event,
          clientId: fullyConnectedPayload.clientId,
        })
        return null
      }
      return { player } as FrameworkEventsMap[E]
    }
    case 'internal:playerSessionRecovered': {
      const recoveredPayload = payload as PlayerSessionRecoveredTransportPayload
      const player = bridgeConfig.players?.getByClient(recoveredPayload.clientId)
      if (!player) {
        loggers.eventBus.warn('Skipping framework event: player not found during hydration', {
          event,
          clientId: recoveredPayload.clientId,
        })
        return null
      }
      return {
        clientId: recoveredPayload.clientId,
        license: recoveredPayload.license,
        player,
      } as FrameworkEventsMap[E]
    }
    default:
      return null
  }
}
