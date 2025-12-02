import { AppError } from '../../utils'
import type { Server } from '../..'

/**
 * Configuration options for state validation requirements.
 * Defines the logical constraints (whitelist/blacklist) applied to the player's current state flags.
 */
export interface StateRequirement {
  /**
   * **Whitelist:** The player **MUST** possess ALL of these states to proceed.
   * If the player is missing any one of these, the execution is blocked.
   * @example ['on_duty_police', 'in_vehicle']
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
 * **Game State Guard Decorator**
 *
 * A method decorator that enforces game logic constraints based on the player's dynamic states.
 * It intercepts the method call and validates the player's flags (e.g., 'dead', 'cuffed', 'driving')
 * before allowing the controller logic to execute.
 *
 * @remarks
 * - This decorator assumes the **first argument** of the decorated method is a `Server.Player` instance.
 * - It throws a `GAME_STATE_ERROR` (AppError) if requirements are not met, which should be caught by the global error handler.
 *
 * @param req - The state requirements configuration (whitelist and/or blacklist).
 *
 * @throws {Error} If the decorated method is called without a valid Player context (Server-side logic error).
 * @throws {AppError} If the player fails the state validation (Client-facing logic error).
 *
 * @example
 * ```ts
 * // Example 1: Action requires being alive (not dead) and not handcuffed
 * @RequiresState({ missing: ['dead', 'cuffed'] })
 * openInventory(player: Server.Player) { ... }
 *
 * // Example 2: Action requires being a police officer on duty
 * @RequiresState({
 * has: ['police_duty'],
 * missing: ['dead'],
 * errorMessage: 'You must be on duty to access the armory.'
 * })
 * openArmory(player: Server.Player) { ... }
 * ```
 */
export function RequiresState(req: StateRequirement) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const player = args[0] as Server.Player

      if (!player) {
        throw new Error(`@RequiresState used on ${propertyKey} without Player context`)
      }

      if (req.has) {
        for (const state of req.has) {
          if (!player.hasState(state)) {
            throw new AppError(
              'GAME_STATE_ERROR',
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
              'GAME_STATE_ERROR',
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
