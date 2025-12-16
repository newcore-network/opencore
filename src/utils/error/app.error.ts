import { type ErrorOrigin } from './types/common.error-codes'
import type { FrameworkErrorCode } from './types/framework.error-codes'

export class AppError extends Error {
  readonly code: FrameworkErrorCode
  readonly details?: unknown
  readonly origin: ErrorOrigin

  constructor(code: FrameworkErrorCode, message: string, origin: ErrorOrigin, details?: unknown) {
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
