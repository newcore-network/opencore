import { inject, injectable } from 'tsyringe'
import type { IExports } from '../../../../adapters/contracts/IExports'
import { type DecoratorProcessor, DI_TOKENS } from '../../../../kernel/di/index'
import { loggers } from '../../../../kernel/shared/logger'
import { resolveMethod } from '../../helpers/resolve-method'
import { METADATA_KEYS } from '../metadata-server.keys'

@injectable()
export class ExportProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.EXPORT

  constructor(@inject(DI_TOKENS.Exports) private exportsService: IExports) {}

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
