import { loggers } from '../../shared/logger'

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
}
