import z from 'zod'
import { AppError } from '../../../'
import { Player } from '../entities/player'

function typeToZodSchema(type: any): z.ZodType | undefined {
  switch (type) {
    case String:
      // Use string().min(1) to reject empty/undefined values
      // Command args are already strings, no coercion needed
      return z.string().min(1)
    case Number:
      return z.coerce.number()
    case Boolean:
      return z.coerce.boolean()
    case Array:
      // Command/event arguments are always strings, so Array means string[]
      // This enables spread operator support: handler(player: Player, ...args: string[])
      return z.array(z.string())
    case Object:
      return undefined
  }
}

export function generateSchemaFromTypes(paramTypes: any[]): z.ZodTuple | undefined {
  if (!paramTypes || paramTypes.length === 0) return z.tuple([])
  if (paramTypes[0] !== Player) {
    throw new AppError(
      'SCHEMA:VALIDATION_ERROR',
      `First parameter must be Player, got ${paramTypes[0]?.name}`,
      'core',
    )
  }
  if (paramTypes.length === 1) return z.tuple([])

  const argSchemas: z.ZodTypeAny[] = []
  for (const t of paramTypes.slice(1)) {
    const s = typeToZodSchema(t)
    if (!s) return undefined
    argSchemas.push(s)
  }

  return z.tuple(argSchemas as any)
}
