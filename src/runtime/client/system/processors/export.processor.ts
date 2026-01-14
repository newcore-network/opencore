import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { coreLogger, LogDomain } from '../../../../kernel/logger'
import { METADATA_KEYS } from '../metadata-client.keys'

const clientExport = coreLogger.child('Export', LogDomain.CLIENT)

@injectable()
export class ClientExportProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.EXPORT

  process(target: any, methodName: string, metadata: { exportName: string }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    ;(globalThis as any).exports(metadata.exportName, async (...args: any[]) => {
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
