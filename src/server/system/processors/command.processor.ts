import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-server.keys'
import { CommandService } from '../../services'
import { CommandOptions } from '../../decorators'

@injectable()
export class CommandProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.COMMAND

  constructor(private commandService: CommandService) {}

  process(target: any, methodName: string, metadata: CommandOptions) {
    const handler = target[methodName].bind(target)
    this.commandService.register(
      {
        ...metadata,
        methodName,
        target: target.constructor,
      },
      handler,
    )
  }
}
