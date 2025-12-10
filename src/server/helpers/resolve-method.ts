import { loggers } from '../../shared/logger'
import { AppError } from '../../utils'

export function resolveMethod(
  instance: Record<string, any>,
  methodName: string,
  errorMessage: string,
):
  | {
      handler: Function
      handlerName: string
      proto: any
    }
  | undefined {
  try {
    const proto = Object.getPrototypeOf(instance)

    const method = instance[methodName]

    if (typeof method !== 'function') {
      loggers.scanner.error(errorMessage, {
        className: instance.constructor.name,
        methodName,
      })
      return
    }

    const handler = method.bind(instance)
    const handlerName = `${instance.constructor.name}.${methodName}`

    return { handler, handlerName, proto }
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new AppError('UNKNOWN', `[${error.name}] ${error.message}`, 'server', error.stack)
    } else throw error
  }
}
