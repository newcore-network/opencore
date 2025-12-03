import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-server.keys'
import { loggers } from '../../../shared/logger'

@injectable()
export class ExportProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.EXPORT

  process(target: any, methodName: string, metadata: { exportName: string }) {
    const handler = target[methodName].bind(target)

    exports(metadata.exportName, handler)

    loggers.exports.debug(`Registered: ${metadata.exportName}`)
  }
}
