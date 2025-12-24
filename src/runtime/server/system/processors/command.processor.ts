import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { METADATA_KEYS } from '../metadata-server.keys'
import { CommandService } from '../../services'
import { CommandMetadata } from '../../decorators/command'

@injectable()
export class CommandProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.COMMAND
  constructor(private commandService: CommandService) {}

  process(target: any, methodName: string, metadata: CommandMetadata) {
    const handler = target[methodName].bind(target)

    // Check if method has @Public decorator
    const proto = Object.getPrototypeOf(target)
    const isPublic = Reflect.getMetadata(METADATA_KEYS.PUBLIC, proto, methodName) as
      | boolean
      | undefined

    // Enrich metadata with isPublic flag
    const enrichedMetadata: CommandMetadata = {
      ...metadata,
      isPublic: isPublic ?? false,
    }

    this.commandService.register(enrichedMetadata, handler)
  }
}
