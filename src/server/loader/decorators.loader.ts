import { di } from '../container'
import {
  getBindingRegistry,
  getCommandRegistry,
  getNetEventRegistry,
  getTickRegistry,
} from '../decorators'
import { serverControllerRegistry } from '../decorators/controller'
import { PlayerManager } from '../services/player'
import { handleCommandError } from '../error-handler'
import { getCoreEventRegistry } from '../decorators/coreEvent'
import { onCoreEvent } from '../bus/core-event-bus'
import { AppError } from 'utils'

const instanceCache = new Map<Function, any>()

export const loadDecorators = () => {
  const commands = getCommandRegistry()
  const nets = getNetEventRegistry()
  const ticks = getTickRegistry()
  const binds = getBindingRegistry()
  const coreEventRegistry = getCoreEventRegistry()

  const playerManager = di.resolve(PlayerManager)

  const getInstance = (target: Function) => {
    let instance = instanceCache.get(target)
    if (!instance) {
      instance = di.resolve(target as any)
      instanceCache.set(target, instance)
    }
    return instance
  }

  for (const Controller of serverControllerRegistry) {
    di.resolve(Controller)
  }

  for (const meta of binds) {
    if (meta.scope === 'singleton') {
      di.registerSingleton(meta.token, meta.useClass)
    } else {
      di.register(meta.token, { useClass: meta.useClass })
    }
  }

  // Commands
  for (const meta of commands) {
    const instance = getInstance(meta.target)
    const method = (instance as any)[meta.methodName].bind(instance)

    RegisterCommand(
      meta.name,
      (src: string, args: string[], raw: string) => {
        const clientID = Number(src)
        const player = playerManager.getByClient(clientID)

        if (!player) {
          const error = new AppError(
            'PLAYER_NOT_FOUND',
            `Jugador ${clientID} no encontrado`,
            'core',
            { command: meta.name, handler: meta.methodName },
          )
          handleCommandError(error, meta, clientID)
          return
        }

        try {
          method(player, args, raw)
        } catch (error) {
          handleCommandError(error, meta, clientID)
        }
      },
      false,
    )
  }

  // NetEvents
  for (const meta of nets) {
    const instance = getInstance(meta.target)
    const method = (instance as any)[meta.methodName].bind(instance)

    onNet(meta.eventName, (...args: any[]) => {
      const clientID = Number(global.source)
      const player = playerManager.getByClient(clientID)
      if (!player) {
        console.warn(
          `[Newcore][NetEvent] No player found for clientID ${clientID} in event "${meta.eventName}".`,
        )
        return
      }
      try {
        method(player, ...args)
      } catch (error) {
        console.error(`[DEBUG] Error in "${meta.eventName}" -> ${meta.methodName}:`, error)
      }
    })
  }

  for (const meta of coreEventRegistry) {
    const instance = di.resolve(meta.target)
    const method = (instance as any)[meta.methodName].bind(instance)

    onCoreEvent(meta.event as any, (payload: any) => {
      try {
        method(payload)
      } catch (error) {
        console.error(
          `[CORE] Error in @OnCoreEvent(${meta.event}) "${meta.methodName}" of ${meta.target.name}:`,
          error,
        )
      }
    })
  }

  const tickHandlers = ticks.map((meta) => {
    const instance = getInstance(meta.target)
    return (instance as any)[meta.methodName].bind(instance)
  })

  if (tickHandlers.length > 0) {
    setTick(async () => {
      for (const handler of tickHandlers) {
        try {
          await handler()
        } catch (error) {
          console.error('[Newcore][Tick] Error in tick handler:', error)
        }
      }
    })
  }

  console.log(
    `[DEBUG][Server] Decorators loaded:
    ${binds.length} Bindings,
    ${commands.length} Commands,
    ${nets.length} NetEvents,
    ${ticks.length} Ticks.`,
  )
}
