import { AppError } from '../../../kernel/utils'
import type { Server } from '../../..'

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
 * Enforces gameplay state requirements before executing a method.
 *
 * The decorator intercepts the method call and verifies whether
 * the player satisfies required state flags (e.g. "dead", "cuffed",
 * "on_duty_police").
 *
 * ## Whitelist (`has`)
 * The player MUST have *all* required states. Missing any state blocks execution.
 *
 * ## Blacklist (`missing`)
 * The player MUST NOT have any of the forbidden states.
 *
 * ## Error Handling
 * - Throws a normal Error if the method is called without a valid Player.
 * - Throws an `AppError(GAME_STATE_ERROR)` if validation fails.
 *
 * ## Example
 * ```ts
 * @RequiresState({ missing: ["dead", "cuffed"] })
 * openInventory(player: Server.Player) { ... }
 *
 * @RequiresState({
 *   has: ["police_duty"],
 *   missing: ["dead"],
 *   errorMessage: "You must be on duty to access the armory."
 * })
 * openArmory(player: Server.Player) { ... }
 * ```
 *
 * @param req - State validation configuration.
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
