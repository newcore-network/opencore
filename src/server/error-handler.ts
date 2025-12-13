import { AppError, isAppError } from '../utils'
import type { CommandMetadata } from './decorators/command'
import { loggers } from '../shared/logger'
import { type ErrorOrigin } from '../utils/error/types/common.error-codes'

function normalizeError(error: unknown, origin: ErrorOrigin): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new AppError('UNKNOWN', error.message, origin, { stack: error.stack })
  }

  return new AppError('UNKNOWN', String(error), origin, { raw: error })
}

export function handleCommandError(error: unknown, meta: CommandMetadata, playerId: number | null) {
  const appError = normalizeError(error, 'server')

  loggers.command.error(`Command execution failed: /${meta.command}`, {
    command: meta.command,
    handler: meta.methodName,
    playerId,
    code: appError.code,
    origin: appError.origin,
    errorMessage: appError.message,
    details: appError.details,
  })

  if (playerId !== null) {
    switch (appError.code) {
      case 'VALIDATION_ERROR':
      case 'INSUFFICIENT_FUNDS':
      case 'PERMISSION_DENIED':
      case 'UNAUTHORIZED':
        emitNet('chat:addMessage', playerId, {
          args: ['^1Error', appError.message],
        })
        break
      default:
        emitNet('chat:addMessage', playerId, {
          args: ['^1Error', 'Ha ocurrido un error interno.'],
        })
        break
    }
  }
}
