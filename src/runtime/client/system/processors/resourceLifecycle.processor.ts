import { inject, injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { coreLogger, LogDomain } from '../../../../kernel/logger'
import { IClientRuntimeBridge } from '../../adapter/runtime-bridge'
import { METADATA_KEYS } from '../metadata-client.keys'

const clientLifecycle = coreLogger.child('Lifecycle', LogDomain.CLIENT)

@injectable()
export class ResourceStartProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.RESOURCE_START

  constructor(@inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge) {}

  process(target: any, methodName: string) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`
    const currentResource = this.runtime.getCurrentResourceName()

    this.runtime.on('onClientResourceStart', async (resourceName: string) => {
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

  constructor(@inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge) {}

  process(target: any, methodName: string) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`
    const currentResource = this.runtime.getCurrentResourceName()

    this.runtime.on('onClientResourceStop', async (resourceName: string) => {
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
