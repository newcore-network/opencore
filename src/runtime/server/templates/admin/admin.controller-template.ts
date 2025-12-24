import type { Player } from '../../entities'

type CommandArgs = string[] | any

/**
 * Template for admin controller implementations.
 */
export interface AdminControllerTemplate {
  handleBanCommand(player: Player, args: CommandArgs, raw?: string): Promise<void>
  handleKickCommand(player: Player, args: CommandArgs, raw?: string): Promise<void>
  handleMuteCommand(player: Player, args: CommandArgs, raw?: string): Promise<void>
  handleUnmuteCommand(player: Player, args: CommandArgs, raw?: string): Promise<void>
}
