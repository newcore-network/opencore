import z from 'zod'
import { Player } from '../entities/player'

function typeToZodSchema(type: any): z.ZodType {
  switch (type) {
    case String: return z.coerce.string()
    case Number: return z.coerce.number()
    case Boolean: return z.coerce.boolean()
    case Array: return z.array(z.any())
    case Object: return z.any()
    default: return z.any()
  }
}

export function generateSchemaFromTypes(paramTypes: any[]): z.ZodTuple | null {
  if (!paramTypes || paramTypes.length <= 1) return null
  
  if (paramTypes[0] !== Player) {
    throw new Error(`@OnNet: First parameter must be Player, got ${paramTypes[0]?.name}`)
  }
  
  const argSchemas = paramTypes.slice(1).map(typeToZodSchema)
  return z.tuple(argSchemas as any)
}