import { inject, injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { coreLogger, LogDomain } from '../../../../kernel/logger'
import { IClientRuntimeBridge } from '../../adapter/runtime-bridge'
import { METADATA_KEYS } from '../metadata-client.keys'

const clientExport = coreLogger.child('Export', LogDomain.CLIENT)

@injectable()
export class ClientExportProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.EXPORT

  constructor(
    @inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge,
  ) {}

  process(target: any, methodName: string, metadata: { exportName: string }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    this.runtime.registerExport(metadata.exportName, async (...args: any[]) => {
      try {
        return await handler(...args)
      } catch (error) {
        clientExport.error(
          `Export handler error`,
          {
            export: metadata.exportName,
            handler: handlerName,
          },
          error as Error,
        )
        throw error
      }
    })

    clientExport.debug(`Registered export: ${metadata.exportName} -> ${handlerName}`)
  }
}
