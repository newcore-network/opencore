import { METADATA_KEYS } from '../system/metadata-server.keys'
import type { ClassConstructor } from '../../../kernel/di/class-constructor'
import type z from 'zod'
import { Player } from '../entities/player'
import { getParameterNames } from '../helpers/function-helper'

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
   * Optional Zod schema for command argument validation.
   *
   * - `z.tuple([...])`: positional args validation.
   * - `z.object({...})`: named args validation (maps args to parameter names).
   *
   * If omitted, the framework auto-validates only primitive arg types (`string|number|boolean|any[]`).
   */
  schema?: z.ZodType
}

export interface CommandMetadata extends CommandConfig {
  methodName: string
  target: ClassConstructor
  paramTypes: any
  paramNames: string[]
  expectsPlayer: boolean
}

type ServerCommandHandler = (() => any) | ((player: Player, ...args: any[]) => any)

/**
 * Marks a method as a chat command. This is connected with the chat module.
 *
 * Handler rules:
 * - First parameter must be `Player`.
 *
 * Validation:
 * - If `config.schema` is provided:
 *   - `z.tuple([...])`: validates positional args (`args: string[]`).
 *   - `z.object({...})`: maps `{ [paramName]: args[index] }` and validates named args.
 * - If `config.schema` is omitted: the framework auto-validates only primitive arg types
 *   (`string|number|boolean|any[]`). Complex types require an explicit schema.
 *
 * @param configOrName Command name or config object.
 *
 * @example DTO JSON in one argument
 * ```ts
 * const dto = z.preprocess((v) => JSON.parse(v as string), z.object({ amount: z.number() }))
 * @Command({ command: 'deposit', usage: '/deposit <json>', schema: z.tuple([dto]) })
 * deposit(player: Player, data: z.infer<typeof dto>) {}
 * ```
 */
export function Command(configOrName: string | CommandConfig) {
  return <T extends ServerCommandHandler>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value)
      throw new Error(`@Command(): descriptor.value is undefined for method '${propertyKey}'`)

    const config: CommandConfig =
      typeof configOrName === 'string' ? { command: configOrName } : configOrName
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) ?? []
    const expectsPlayer = paramTypes.length > 0 && paramTypes[0] === Player
    if (paramTypes.length > 0 && !expectsPlayer) {
      throw new Error(
        `@Command '${config.command}': first parameter must be Player if parameters are present`,
      )
    }

    const paramNames = getParameterNames(descriptor.value)
    const metadata: CommandMetadata = {
      ...config,
      methodName: propertyKey,
      target: target.constructor,
      paramTypes,
      paramNames,
      expectsPlayer,
    }

    Reflect.defineMetadata(METADATA_KEYS.COMMAND, metadata, target, propertyKey)
  }
}
