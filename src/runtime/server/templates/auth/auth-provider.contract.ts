import type { PlayerSessionCreatedPayload } from '../../types/core-events'
import type { Player } from '../../entities/player'
import type { LinkedID } from '../../services'
import type { Server } from '../../../..'

export interface AuthCredentials {
  /** Standard username/password auth */
  username?: string
  password?: string
  /** License-based auto-auth */
  license?: string
  /** Discord OAuth */
  discordToken?: string
  /** Custom auth data */
  [key: string]: unknown
}

export interface AuthResult {
  success: boolean
  accountID?: LinkedID
  error?: string
  /** Optional: newly created account flag */
  isNewAccount?: boolean
}

/**
 * **Authentication**
 *
 * Defines the Authentication flow (login/register/logout).
 * This is separate from Authorization (roles/permissions) handled by PrincipalProviderContract.
 *
 * @example
 *
 * class MyAuthProvider implements AuthProviderContract {
 *   async authenticate(player, credentials) {
 *     const user = await db.users.findByLicense(credentials.license)
 *     if (!user) return { success: false, error: 'User not found' }
 *     player.linkAccount(user.id)
 *     return { success: true, accountID: user.id }
 *   }
 * }
 *  */
export abstract class AuthProviderContract {
  /**
   * Authenticates a player and links their account.
   * Called during the login flow.
   */
  abstract authenticate(player: Server.Player, credentials: AuthCredentials): Promise<AuthResult>

  /**
   * Registers a new account for the player.
   * Can optionally auto-authenticate after registration.
   */
  abstract register(player: Server.Player, credentials: AuthCredentials): Promise<AuthResult>

  /**
   * Validates an existing session/token.
   * Useful for reconnections or persistent sessions.
   */
  abstract validateSession(player: Server.Player): Promise<AuthResult>

  /**
   * Clears the player's authenticated session.
   */
  abstract logout(player: Server.Player): Promise<void>
}
