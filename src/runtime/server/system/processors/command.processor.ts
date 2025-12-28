import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { METADATA_KEYS } from '../metadata-server.keys'
import { CommandExecutionPort } from '../../services/ports/command-execution.port'
import { CommandMetadata } from '../../decorators/command'

/**
 * Processor for @Command decorator.
 *
 * @remarks
 * Reads command metadata and registers handlers with CommandExecutionPort.
 * The port implementation (local or remote) depends on runtime mode.
 */
@injectable()
export class CommandProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.COMMAND

  constructor(private commandService: CommandExecutionPort) {}

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
