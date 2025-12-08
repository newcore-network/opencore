import { METADATA_KEYS } from '../system/metadata-server.keys'
import type { ClassConstructor } from '../../system/class-constructor'
import type z from 'zod'
import type { Player } from '../entities/player'

export interface CommandConfig {
  /**
   * The command name (e.g. "revive", "deposit"), used in chat "/revive"
   */
  command: string
  /**
   * The command description, maybe "/help revive"
   */
  description?: string
  /**
   * The command usage, maybe "/revive <player>"
   */
  usage?: string
  /**
   * The command schema, used to validate the arguments, validated with zod
   * @example
   * ```ts
   * Server.Command({
   *   command: 'revive',
   *   schema: z.object({
   *     player: z.string(),
   *   }),
   * })
   * ```
   */
  schema?: z.ZodType
}

export interface CommandMetadata extends CommandConfig {
  methodName: string
  target: ClassConstructor
  paramTypes?: any
}

type ServerCommandHandler = (player: Player, ...args: any[]) => any

/**
 * Decorator used to mark a controller method as a command.
 * This method will be registered and then executed by the command service.
 * It will depend on the chat you have implemented following the dependency conventions.
 *
 * @param configOrName - The command name (e.g. "revive", "deposit")
 * @validation zod schema
 * @handlerSignature ```ts
 *  (player: Server.Player, args: any[]) => any
 * ```
 */
export function Command(configOrName: string | CommandConfig) {
  return <T extends ServerCommandHandler>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    const config: CommandConfig =
      typeof configOrName === 'string' ? { command: configOrName } : configOrName

    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey)

    const metadata: CommandMetadata = {
      ...config,
      methodName: propertyKey,
      target: target.constructor,
      paramTypes,
    }

    Reflect.defineMetadata(METADATA_KEYS.COMMAND, metadata, target, propertyKey)
  }
}
