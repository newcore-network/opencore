import { AppError, isAppError } from '../utils'
import type { ErrorOrigin } from '../utils/'
import type { CommandMeta } from './decorators/command'

function normalizeError(error: unknown, origin: ErrorOrigin): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new AppError('UNKNOWN', error.message, origin, { stack: error.stack })
  }

  return new AppError('UNKNOWN', String(error), origin, { raw: error })
}

export function handleCommandError(error: unknown, meta: CommandMeta, playerId: number | null) {
  const appError = normalizeError(error, 'server')

  console.error('[CORE] Command error', {
    command: meta.name,
    handler: meta.methodName,
    playerId,
    code: appError.code,
    origin: appError.origin,
    message: appError.message,
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
