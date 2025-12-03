import type { Server } from '../..'
import { di } from '../container'
import { AccessControlService } from '../services'
import { loggers } from '../../shared/logger'

export interface GuardOptions {
  rank?: number
  permission?: string
}

export function Guard(options: GuardOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    descriptor.value = async function (...args: any[]) {
      const player = args[0] as Server.Player
      if (!player || !player.clientID) {
        loggers.security.warn(`@Guard misuse: First argument is not a Player`, {
          method: propertyKey,
          targetClass: target.constructor?.name,
        })
        throw new Error('Guard Security Error: Context is not a player')
      }

      const accessControl = di.resolve(AccessControlService)
      await accessControl.enforce(player, {
        minRank: options.rank,
        permission: options.permission,
      })
      return originalMethod.apply(this, args)
    }
    // no need a defined metadata key, as we won't read it later
    Reflect.defineMetadata('core:guard', options, target, propertyKey)
    return descriptor
  }
}
