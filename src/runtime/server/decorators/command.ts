import type { z } from 'zod'
import type { ClassConstructor } from '../../../kernel/di/class-constructor'
import { Player } from '../entities/player'
import { getParameterNames } from '../helpers/function-helper'
import { METADATA_KEYS } from '../system/metadata-server.keys'
import type { SecurityMetadata } from '../types/core-exports'

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
  isPublic?: boolean
  /** Security metadata for remote validation */
  security?: SecurityMetadata
}

type ServerCommandHandler = (() => any) | ((player: Player, ...args: any[]) => any)

/**
 * Registers a method as a chat command.
 *
 * @remarks
 * Handler rules:
 * - If the handler has parameters, the first parameter must be `Player`.
 *
 * Validation rules:
 * - If schema is provided:
 *   - `z.tuple([...])` validates positional args.
 *   - `z.object({...})` validates named args by mapping chat args to parameter names.
 * - If schema is omitted, the framework can only auto-validate primitive types
 *   (`string|number|boolean|any[]`). Complex payloads should use an explicit Zod schema.
 *
 * @param configOrName - Command name, full config, or just command name with schema as second arg.
 * @param schema - Optional Zod schema when using short form @Command("name", schema).
 *
 * @throws Error - If applied to a method without a valid descriptor.
 * @throws Error - If the method has parameters but does not declare `Player` as the first parameter.
 *
 * @example
 * ```ts
 * import { z, Infer } from '@open-core/framework'
 *
 * const AmountSchema = z.object({ amount: z.number() })
 *
 * @Server.Controller()
 * export class BankController {
 *   // Simple command (no schema)
 *   @Server.Command('help')
 *   help(player: Player) { }
 *
 *   // With schema directly (recommended)
 *   @Server.Command('deposit', AmountSchema)
 *   deposit(player: Player, data: Infer<typeof AmountSchema>) { }
 *
 *   // With full config object (for description, usage, etc.)
 *   @Server.Command({ command: 'withdraw', schema: AmountSchema, usage: '/withdraw <amount>' })
 *   withdraw(player: Player, data: Infer<typeof AmountSchema>) { }
 * }
 * ```
 */
// Overload: command name with schema as second argument (recommended for simple commands)
export function Command(name: string, schema: z.ZodType): MethodDecorator

// Overload: command name only
export function Command(name: string): MethodDecorator

// Overload: full config object
export function Command(config: CommandConfig): MethodDecorator

// Implementation
export function Command(configOrName: string | CommandConfig, schema?: z.ZodType) {
  return <T extends ServerCommandHandler>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    if (!descriptor.value)
      throw new Error(`@Command(): descriptor.value is undefined for method '${propertyKey}'`)

    // Build config from various input forms
    let config: CommandConfig
    if (typeof configOrName === 'string') {
      config = { command: configOrName, schema }
    } else {
      config = configOrName
    }

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
