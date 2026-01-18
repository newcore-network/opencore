import z from 'zod'
import { AppError } from '../../../kernel'
import { CommandMetadata } from '../decorators/command'
import { Player } from '../entities'
import { generateSchemaFromTypes } from '../system/schema-generator'
import { processTupleSchema } from './process-tuple-schema'

export async function validateAndExecuteCommand(
  meta: CommandMetadata,
  player: Player,
  args: string[],
  handler: (...args: any[]) => any,
): Promise<any> {
  const paramNames = meta.expectsPlayer ? meta.paramNames.slice(1) : meta.paramNames
  let schema: z.ZodTypeAny | undefined = meta.schema

  if (!meta.expectsPlayer) {
    if (args.length > 0) {
      throw new AppError('GAME:BAD_REQUEST', `Incorrect usage, use: ${meta.usage}`, 'client', {
        usage: meta.usage,
      })
    }
    return await handler()
  }

  if (!schema) {
    schema = generateSchemaFromTypes(meta.paramTypes)

    if (!schema) {
      if (paramNames.length > 0) {
        throw new AppError(
          'SCHEMA:MISMATCH',
          `Command '${meta.command}' has parameters ${paramNames.join(', ')} but no schema was provided.`,
          'core',
        )
      }
      return await handler(player)
    }
  }

  if (schema instanceof z.ZodObject) {
    const keys = Object.keys(schema.shape)

    for (const p of paramNames) {
      if (!keys.includes(p)) {
        throw new AppError(
          'SCHEMA:MISMATCH',
          `Command '${meta.command}' is missing schema for parameter '${p}'.`,
          'core',
        )
      }
    }

    for (const key of keys) {
      if (!paramNames.includes(key)) {
        throw new AppError(
          'SCHEMA:MISMATCH',
          `Schema for command '${meta.command}' defines '${key}', but handler does not.`,
          'core',
        )
      }
    }

    const inputObj: Record<string, unknown> = {}
    for (let i = 0; i < paramNames.length; i++) {
      inputObj[paramNames[i]] = args[i]
    }

    const validated = await schema.parseAsync(inputObj).catch(() => {
      throw new AppError('GAME:BAD_REQUEST', `Incorrect usage, use: ${meta.usage}`, 'client', {
        usage: meta.usage,
      })
    })

    const obj = validated as Record<string, unknown>
    const finalArgs = paramNames.map((name) => obj[name])
    return await handler(player, ...finalArgs)
  }

  // TUPLA schema
  if (schema instanceof z.ZodTuple) {
    const processedArgs = processTupleSchema(schema, args)

    const validated = await schema.parseAsync(processedArgs).catch(() => {
      throw new AppError('GAME:BAD_REQUEST', `Incorrect usage, use: ${meta.usage}`, 'client', {
        usage: meta.usage,
      })
    })

    const finalArgs = validated as unknown[]

    // If the handler uses spread operator (...args), flatten the last array argument
    // so the handler receives individual arguments instead of a single array.
    if (
      meta.hasSpreadParam &&
      finalArgs.length > 0 &&
      Array.isArray(finalArgs[finalArgs.length - 1])
    ) {
      const positional = finalArgs.slice(0, finalArgs.length - 1)
      const rest = finalArgs[finalArgs.length - 1] as unknown[]
      return await handler(player, ...positional, ...rest)
    }

    // For regular array parameters (args: string[]), pass as-is
    return await handler(player, ...finalArgs)
  }

  // fallback
  return await handler(player)
}
