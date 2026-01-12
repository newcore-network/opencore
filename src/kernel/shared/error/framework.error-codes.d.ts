/**
 * Framework error codes grouped by category
 */
export type FrameworkErrorCode =
  | CommonErrorCode
  | AuthErrorCode
  | ApiErrorCode
  | NetworkErrorCode
  | GameErrorCode
  | SchemaErrorCode
  | CommandErrorCode
  | EconomyErrorCode

// Common / base
export type CommonErrorCode = 'COMMON:UNKNOWN' | 'COMMON:NOT_IMPLEMENTED'

// Auth
export type AuthErrorCode = 'AUTH:UNAUTHORIZED' | 'AUTH:PERMISSION_DENIED'

// API / Network
export type ApiErrorCode = 'API:ERROR'

export type NetworkErrorCode = 'NETWORK:ERROR'

// Game logic
export type GameErrorCode =
  | 'GAME:PLAYER_NOT_FOUND'
  | 'GAME:NO_RANK_IN_PRINCIPAL'
  | 'GAME:INVALID_STATE'
  | 'GAME:BAD_REQUEST'

// Schema / Validation
export type SchemaErrorCode = 'SCHEMA:VALIDATION_ERROR' | 'SCHEMA:MISMATCH'

// Commands
export type CommandErrorCode = 'COMMAND:NOT_FOUND' | 'COMMAND:DUPLICATE'

// Economy
export type EconomyErrorCode = 'ECONOMY:INSUFFICIENT_FUNDS'
