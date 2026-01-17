import { AppError, type ErrorOrigin, isAppError } from '../../../kernel/error'

/**
 * Normalizes unknown thrown values into a consistent {@link AppError}.
 *
 * @remarks
 * Command and event pipelines should never leak raw errors.
 * This helper ensures observers always receive an AppError.
 */
export function normalizeToAppError(error: unknown, origin: ErrorOrigin): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new AppError('COMMON:UNKNOWN', error.message, origin, { stack: error.stack })
  }

  return new AppError('COMMON:UNKNOWN', String(error), origin, { raw: error })
}
