import { AppError } from '../../../kernel/error'
import type { CommandMetadata } from '../decorators/command'
import type { Player } from '../entities/player'
import type { FeatureScope, FrameworkMode } from '../runtime'

/**
 * High-level stage where a command error happened.
 *
 * @remarks
 * Useful to drive decisions (e.g. show usage on validation errors).
 */
export type CommandErrorStage =
  | 'dispatch'
  | 'auth'
  | 'security'
  | 'validation'
  | 'handler'
  | 'unknown'

/**
 * Public-facing command info intended for error reporting.
 */
export interface CommandErrorCommandInfo {
  command: string
  description?: string
  usage?: string
  isPublic?: boolean
  methodName?: string
  expectsPlayer?: boolean
  paramNames?: string[]
}

/**
 * Minimal player identity for error reporting.
 */
export interface CommandErrorPlayerInfo {
  clientId: number
  accountId?: string
  name?: string
}

/**
 * Rich context emitted whenever command execution fails.
 *
 * @remarks
 * The framework does not notify players directly. Consumers can implement
 * {@link CommandErrorObserverContract} to decide how to report errors.
 */
export interface CommandErrorContext {
  mode: FrameworkMode
  scope: FeatureScope
  stage: CommandErrorStage
  error: AppError
  commandName: string
  args: string[]
  player: CommandErrorPlayerInfo
  /**
   * Optional reference to the Player entity. Useful for custom
   * (e.g. sending a chat message).
   */
  playerRef?: Player
  /**
   * Best-effort command info (usage/description/etc.) to support.
   */
  command?: CommandErrorCommandInfo
  /**
   * Raw metadata from the decorator, when available in the current runtime.
   */
  commandMeta?: CommandMetadata
  /**
   * If the command is owned by a resource (remote command), indicates the owner.
   */
  ownerResourceName?: string
}

/**
 * Global observer contract for command execution errors.
 */
export abstract class CommandErrorObserverContract {
  /**
   * Called whenever command execution fails.
   */
  abstract onError(ctx: CommandErrorContext): Promise<void>
}
