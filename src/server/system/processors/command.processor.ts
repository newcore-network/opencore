import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-server.keys'
import { CommandService } from '../../services'
import { CommandConfig } from '../../decorators'
import { CommandMetadata } from '../../decorators/command'

@injectable()
export class CommandProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.COMMAND

  constructor(private commandService: CommandService) {}

  process(target: any, methodName: string, metadata: CommandConfig) {
    const handler = target[methodName].bind(target)
    const fullMeta: CommandMetadata = {
      ...metadata,
      methodName,
      target: target.constructor,
    }
    this.commandService.register(fullMeta, handler)
  }
}
