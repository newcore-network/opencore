/**
 * Represents the security identity of a user/player within the framework.
 * This interface bridges the gap between the Core framework and your specific implementation.
 */
export interface Principal {
  /**
   * Unique identifier for the user (e.g., persistent role ID).
   */
  id: string
  /**
   * Display name for the role or user, useful for Chat or UI (e.g., "Moderator", "VIP").
   */
  name?: string
  /**
   * Numeric weight for hierarchy comparisons.
   * - Used by the `@Guard({ rank: N })` decorator.
   * - **Logic:** `UserRank >= RequiredRank`.
   * - Higher numbers imply higher privileges.
   */
  rank?: number
  /**
   * List of specific permission strings assigned to this principal.
   * - Used by the `@Guard({ permission: 'string' })` decorator.
   * - Supports the `'*'` wildcard for super-admin access.
   */
  permissions: string[]
  /**
   * Arbitrary metadata for game-specific logic (e.g., chat colors, badge IDs, staff status).
   * This prevents the need to modify the Core types for visual extras.
   */
  meta?: Record<string, unknown>
}
