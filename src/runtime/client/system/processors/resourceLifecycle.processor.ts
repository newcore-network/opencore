import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { METADATA_KEYS } from '../metadata-client.keys'
import { coreLogger, LogDomain } from '../../../../kernel/shared/logger'

const clientLifecycle = coreLogger.child('Lifecycle', LogDomain.CLIENT)

@injectable()
export class ResourceStartProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.RESOURCE_START

  process(target: any, methodName: string) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`
    const currentResource = GetCurrentResourceName()

    on('onClientResourceStart', async (resourceName: string) => {
      if (resourceName !== currentResource) return

      try {
        await handler(resourceName)
      } catch (error) {
        clientLifecycle.error(
          `Resource start handler error`,
          {
            handler: handlerName,
            resource: resourceName,
          },
          error as Error,
        )
      }
    })

    clientLifecycle.debug(`Registered resource start handler: ${handlerName}`)
  }
}

@injectable()
export class ResourceStopProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.RESOURCE_STOP

  process(target: any, methodName: string) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`
    const currentResource = GetCurrentResourceName()

    on('onClientResourceStop', async (resourceName: string) => {
      if (resourceName !== currentResource) return

      try {
        await handler(resourceName)
      } catch (error) {
        clientLifecycle.error(
          `Resource stop handler error`,
          {
            handler: handlerName,
            resource: resourceName,
          },
          error as Error,
        )
      }
    })

    clientLifecycle.debug(`Registered resource stop handler: ${handlerName}`)
  }
}
