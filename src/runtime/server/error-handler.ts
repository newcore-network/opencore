import { loggers } from '../../kernel/shared/logger'
import { AppError, isAppError } from '../../kernel/utils'
import { ErrorOrigin } from '../../kernel/utils/error/types/common.error-codes'
import { CommandMetadata } from './decorators/command'

function normalizeError(error: unknown, origin: ErrorOrigin): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new AppError('COMMON:UNKNOWN', error.message, origin, { stack: error.stack })
  }

  return new AppError('COMMON:UNKNOWN', String(error), origin, { raw: error })
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
      case 'ECONOMY:INSUFFICIENT_FUNDS':
      case 'AUTH:PERMISSION_DENIED':
      case 'AUTH:UNAUTHORIZED':
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
