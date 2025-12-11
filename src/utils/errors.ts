import type { SecurityAction } from '../server/types/security.types'

export type FrameworkErroCode =
  | 'PLAYER_NOT_FOUND'
  | 'INSUFFICIENT_FUNDS'
  | 'VALIDATION_ERROR'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'PERMISSION_DENIED'
  | 'NOT_IMPLEMENTED'
  | 'NO_RANK_IN_PRINCIPAL'
  | 'UNKNOWN'
  | 'GAME_STATE_ERROR'
  | 'SCHEMA_MISMATCH'
  | 'COMMAND_NOT_FOUND'
  | 'COMMAND_DUPLICATE'

export type ErrorOrigin = 'client' | 'server' | 'core' | 'external'

export class AppError extends Error {
  readonly code: FrameworkErroCode
  readonly details?: unknown
  readonly origin: ErrorOrigin

  constructor(code: FrameworkErroCode, message: string, origin: ErrorOrigin, details?: unknown) {
    super(message)
    this.code = code
    this.details = details
    this.origin = origin

    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export class SecurityError extends AppError {
  readonly action: SecurityAction

  constructor(action: SecurityAction, message: string, details?: unknown) {
    super('NETWORK_ERROR', message, 'core', details)
    this.action = action
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
