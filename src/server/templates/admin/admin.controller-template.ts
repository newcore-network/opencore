import type { Server } from '../../..'

/**
 * Template for admin controller implementations.
 */
export interface AdminControllerTemplate {
  handleBanCommand(player: Server.Player, args: string[], raw?: string): Promise<void>
  handleKickCommand(player: Server.Player, args: string[], raw?: string): Promise<void>
  handleMuteCommand(player: Server.Player, args: string[], raw?: string): Promise<void>
  handleUnmuteCommand(player: Server.Player, args: string[], raw?: string): Promise<void>
}
