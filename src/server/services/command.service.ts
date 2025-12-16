import { injectable } from 'tsyringe'
import type { CommandMetadata } from '../decorators/command'
import { AppError } from '../../utils'
import z from 'zod'
import { loggers } from '../../shared/logger'
import { generateSchemaFromTypes } from '../system/schema-generator'
import { Player } from '../entities'

@injectable()
export class CommandService {
  constructor() {}

  private commands = new Map<string, { meta: CommandMetadata; handler: Function }>()

  register(meta: CommandMetadata, handler: Function) {
    if (this.commands.has(meta.command.toLowerCase())) {
      loggers.command.error(`Command '${meta.command}' is already registered. Skipped`, {
        command: meta.command,
      })
    }
    this.commands.set(meta.command.toLowerCase(), { meta, handler })
    loggers.command.debug(`Registered: /${meta.command}${meta.schema ? ' [Validated]' : ''}`)
  }

  async execute(player: Player, commandName: string, args: string[]) {
    const entry = this.commands.get(commandName.toLowerCase())
    if (!entry)
      throw new AppError('COMMAND:NOT_FOUND', `Command not found: ${commandName}`, 'client')

    const { meta, handler } = entry

    // Delete Player from args, player is the first argument for convention
    const paramNames = meta.paramNames.slice(1)
    let schema: z.ZodTypeAny | undefined = meta.schema

    // CASE 1 — No schema provided by user → try autogenerate
    if (!schema) {
      schema = generateSchemaFromTypes(meta.paramTypes)

      // CASE 2 — Autogeneration failed
      if (!schema) {
        // If handler expects args but no schema exists → ERROR
        throw new AppError(
          'SCHEMA:MISMATCH',
          `Command '${meta.command}' has parameters ${paramNames.join(
            ', ',
          )} but no schema was provided.`,
          'core',
        )
      }
    }

    // CASE 3 — Schema provided by user (Object Schema)
    if (schema instanceof z.ZodObject) {
      const keys = Object.keys(schema.shape)

      // Validate missing keys
      for (const p of paramNames) {
        if (!keys.includes(p)) {
          throw new AppError(
            'SCHEMA:MISMATCH',
            `Command '${meta.command}' is missing schema for parameter '${p}'.`,
            'core',
          )
        }
      }

      // Validate extra keys
      for (const key of keys) {
        if (!paramNames.includes(key)) {
          throw new AppError(
            'SCHEMA:MISMATCH',
            `Schema for command '${meta.command}' defines '${key}', but handler does not.`,
            'core',
          )
        }
      }

      // Build input object
      const inputObj: Record<string, unknown> = {}
      for (let i = 0; i < paramNames.length; i++) {
        inputObj[paramNames[i]] = args[i]
      }

      // Validate
      const validated = await schema.parseAsync(inputObj).catch(() => {
        throw new AppError('GAME:BAD_REQUEST', `Incorrect usage, use: ${meta.usage}`, 'client', {
          usage: meta.usage,
        })
      })

      const obj = validated as Record<string, any>
      const finalArgs = paramNames.map((name) => obj[name])
      return await handler(player, ...finalArgs)
    }

    // CASE 4 — Tuple schema (auto-generated)
    if (schema instanceof z.ZodTuple) {
      const validated = await schema.parseAsync(args).catch(() => {
        throw new AppError('GAME:BAD_REQUEST', `Incorrect usage, use: ${meta.usage}`, 'client', {
          usage: meta.usage,
        })
      })

      return await handler(player, ...(validated as unknown[]))
    }

    // fallback (rarely used)
    return await handler(player)
  }

  getAllCommands() {
    return Array.from(this.commands.values()).map((c) => ({
      command: c.meta.command,
      description: c.meta.description ?? '',
      usage: c.meta.usage ?? '',
    }))
  }
}
