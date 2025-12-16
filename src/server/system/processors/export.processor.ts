import { injectable, inject } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-server.keys'
import { loggers } from '../../../shared/logger'
import { resolveMethod } from '../../helpers/resolve-method'
import { IExports } from '../../capabilities/IExports'

@injectable()
export class ExportProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.EXPORT

  constructor(@inject(IExports as any) private exportsService: IExports) {}

  process(instance: any, methodName: string, metadata: { exportName: string }) {
    const result = resolveMethod(
      instance,
      methodName,
      `[ExportEventProcessor] Method "${methodName}" not found`,
    )
    if (!result) return
    const { handler } = result

    this.exportsService.register(metadata.exportName, handler)
    loggers.exports.debug(`Registered: ${metadata.exportName}`)
  }
}
