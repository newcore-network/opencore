import type { Server } from '../../..'
import { AppError } from '../../../kernel/utils'
import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Configuration options for state validation requirements.
 * Defines the logical constraints (whitelist/blacklist) applied to the player's current state flags.
 */
export interface StateRequirement {
  /**
   * **Whitelist:** The player **MUST** possess ALL of these states to proceed.
   * If the player is missing any one of these, the execution is blocked.
   * @example ['on_duty', 'in_vehicle']
   */
  has?: string[]

  /**
   * **Blacklist:** The player **MUST NOT** possess ANY of these states to proceed.
   * If the player has any one of these, the execution is blocked.
   * @example ['dead', 'cuffed', 'unconscious']
   */
  missing?: string[]

  /**
   * A custom message to display to the client if validation fails.
   * If omitted, a default generic message will be generated based on the missing/conflicting state.
   */
  errorMessage?: string
}

/**
 * Enforces gameplay state requirements before executing a method.
 *
 * @remarks
 * The decorator wraps the original method and verifies whether the player satisfies required
 * state flags (e.g. `dead`, `cuffed`, `on_duty_police`).
 *
 * Rules:
 * - The decorated method must receive a `Server.Player` instance as its first argument.
 *
 * Validation:
 * - `req.has`: the player must have *all* of these states.
 * - `req.missing`: the player must have *none* of these states.
 *
 * @param req - State validation configuration.
 *
 * @throws Error - If the method is invoked without a `Player` as the first argument.
 * @throws AppError - If the player does not satisfy the configured requirements.
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class InventoryController {
 *   @Server.RequiresState({ missing: ['dead', 'cuffed'] })
 *   openInventory(player: Server.Player) {
 *     // ...
 *   }
 *
 *   @Server.RequiresState({
 *     has: ['police_duty'],
 *     missing: ['dead'],
 *     errorMessage: 'You must be on duty to access the armory.',
 *   })
 *   openArmory(player: Server.Player) {
 *     // ...
 *   }
 * }
 * ```
 */
export function RequiresState(req: StateRequirement) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    // Store metadata for remote transmission
    Reflect.defineMetadata(METADATA_KEYS.REQUIRES_STATE, req, target, propertyKey)

    descriptor.value = async function (...args: any[]) {
      const player = args[0] as Server.Player

      if (!player) {
        throw new Error(`@RequiresState used on ${propertyKey} without Player context`)
      }

      if (req.has) {
        for (const state of req.has) {
          if (!player.hasState(state)) {
            throw new AppError(
              'GAME:INVALID_STATE',
              req.errorMessage || `You must be [${state}] to do this.`,
              'client',
            )
          }
        }
      }

      if (req.missing) {
        for (const state of req.missing) {
          if (player.hasState(state)) {
            throw new AppError(
              'GAME:INVALID_STATE',
              req.errorMessage || `You can't do this while you're [${state}].`,
              'client',
            )
          }
        }
      }

      return originalMethod.apply(this, args)
    }

    return descriptor
  }
}
