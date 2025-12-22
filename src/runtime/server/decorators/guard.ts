import type { Server } from '../../..'
import { di } from '../../../kernel/di/container'
import { AccessControlService } from '../services'
import { loggers } from '../../../kernel/shared/logger'

export interface GuardOptions {
  /**
   * Minimum rank required to execute the method.
   * Permissions and Role/Ranks are defined by your Principal Controller
   */
  rank?: number
  /**
   * Permission required to execute the method.
   * Permissions and Role/Ranks are defined by your Principal Controller
   */
  permission?: string
}

/**
 * Declarative access-control decorator for controller methods.
 *
 * @remarks
 * `@Guard()` protects a method by enforcing rank and/or permission requirements before executing it.
 *
 * Requirements are evaluated through {@link AccessControlService}, which determines whether the
 * player (first argument of the method) is authorized to perform the action.
 *
 * Notes:
 * - The decorated method must receive a `Server.Player` instance as its first argument.
 * - In stripped decorator builds (e.g. benchmarks), the `PropertyDescriptor` may be missing.
 *   In that case the decorator stores metadata only and does not wrap the method.
 *
 * @param options - Guard options.
 * @param options.rank - Minimum rank required.
 * @param options.permission - Permission required.
 *
 * @throws Error - If the method is invoked without a valid `Player` as the first argument.
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class FactionController {
 *   @Server.Guard({ permission: 'factions.manage' })
 *   async createFaction(player: Server.Player, dto: CreateFactionDTO) {
 *     return this.service.create(dto)
 *   }
 *
 *   @Server.Guard({ rank: 3 })
 *   async promoteMember(player: Server.Player, memberID: string) {
 *     return this.service.promote(player, memberID)
 *   }
 * }
 * ```
 */
export function Guard(options: GuardOptions) {
  return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
    if (!descriptor) {
      // In benchmarks or edge cases, only register metadata without method wrapping
      // This should NOT happen in production code with proper TypeScript compilation
      loggers.security.warn(
        `@Guard decorator: PropertyDescriptor not available. Only metadata will be registered. This should not happen in production code. Target: ${target.constructor?.name}, Method: ${propertyKey}`,
      )
      Reflect.defineMetadata('core:guard', options, target, propertyKey)
      return
    }
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
