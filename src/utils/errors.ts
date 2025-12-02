export type FrameworkErroCode =
  | 'PLAYER_NOT_FOUND'
  | 'INSUFFICIENT_FUNDS'
  | 'VALIDATION_ERROR'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'PERMISSION_DENIED'
  | 'NOT_IMPLEMENTED'
  | 'UNKNOWN'

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
