import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/index'
import { CommandMetadata } from '../../decorators/command'
import { GuardOptions } from '../../decorators/guard'
import { StateRequirement } from '../../decorators/requiresState'
import { ThrottleOptions } from '../../decorators/throttle'
import { CommandExecutionPort } from '../../services/ports/command-execution.port'
import { SecurityMetadata } from '../../types/core-exports'
import { METADATA_KEYS } from '../metadata-server.keys'

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

    // Collect security metadata from decorators
    const guardOptions: GuardOptions | undefined = Reflect.getMetadata(
      'core:guard',
      proto,
      methodName,
    )
    const throttleOptions: ThrottleOptions | undefined = Reflect.getMetadata(
      METADATA_KEYS.THROTTLE,
      proto,
      methodName,
    )
    const requiresStateOptions: StateRequirement | undefined = Reflect.getMetadata(
      METADATA_KEYS.REQUIRES_STATE,
      proto,
      methodName,
    )

    // Build security metadata if any decorator is present
    const security: SecurityMetadata | undefined =
      guardOptions || throttleOptions || requiresStateOptions
        ? {
            guard: guardOptions,
            throttle: throttleOptions,
            requiresState: requiresStateOptions,
          }
        : undefined

    // Enrich metadata with isPublic flag and security
    const enrichedMetadata: CommandMetadata = {
      ...metadata,
      isPublic: isPublic ?? false,
      security,
    }

    this.commandService.register(enrichedMetadata, handler)
  }
}
