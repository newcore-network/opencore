import { inject, injectable } from 'tsyringe'
import { IExports } from '../../../../adapters/contracts/IExports'
import { type DecoratorProcessor } from '../../../../kernel/di/index'
import { loggers } from '../../../../kernel/logger'
import { resolveMethod } from '../../helpers/resolve-method'
import { METADATA_KEYS } from '../metadata-server.keys'

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
