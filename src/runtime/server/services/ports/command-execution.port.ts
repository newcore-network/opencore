import { CommandMetadata } from '../../decorators/command'
import { Player } from '../../entities'

/**
 * Command information returned by getAllCommands.
 */
export interface CommandInfo {
  command: string
  description?: string
  usage?: string
  isPublic: boolean
}

/**
 * Abstract port for command registration and execution.
 *
 * @remarks
 * This port provides mode-agnostic access to the command system.
 * Implementations:
 * - CommandService (local): CORE/STANDALONE modes maintain command registry locally
 * - RemoteCommandService (remote): RESOURCE mode delegates to CORE via exports
 */
export abstract class CommandExecutionPort {
  /**
   * Registers a command handler.
   *
   * @param metadata - Command metadata from decorator
   * @param handler - Bound method to invoke when command is executed
   */
  abstract register(metadata: CommandMetadata, handler: (...args: any[]) => any): void

  /**
   * Executes a registered command.
   *
   * @param player - Player invoking the command
   * @param commandName - Command name (without leading slash)
   * @param args - Raw argument strings
   */
  abstract execute(player: Player, commandName: string, args: string[]): Promise<void>

  /**
   * Returns metadata for a command if registered in this runtime.
   *
   * @remarks
   * Used to enrich error observation (usage/description/etc.).
   */
  abstract getCommandMeta(commandName: string): CommandMetadata | undefined

  /**
   * Returns all registered commands.
   */
  abstract getAllCommands(): CommandInfo[]
}
