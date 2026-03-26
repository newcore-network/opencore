import z from 'zod'

export function processTupleSchema(schema: z.ZodTuple, args: unknown[]): unknown[] {
  const tupleDef = schema._def as unknown as { items?: readonly z.ZodTypeAny[] }
  const items = schema.description ? [] : [...(tupleDef.items ?? [])]

  if (items.length === 0) {
    return args
  }

  const lastItem = items[items.length - 1]
  const positionalCount = items.length - 1

  if (args.length > items.length) {
    if (lastItem instanceof z.ZodString) {
      const positional = args.slice(0, positionalCount)
      const restString = args.slice(positionalCount).map(String).join(' ')
      return [...positional, restString]
    }

    if (lastItem instanceof z.ZodArray) {
      const positional = args.slice(0, positionalCount)
      const restArray = args.slice(positionalCount)
      return [...positional, restArray]
    }
  }

  if (args.length === items.length) {
    if (lastItem instanceof z.ZodArray && !Array.isArray(args[positionalCount])) {
      const positional = args.slice(0, positionalCount)
      return [...positional, [args[positionalCount]]]
    }
  }

  if (args.length < items.length) {
    return [...args, ...Array.from({ length: items.length - args.length }, () => undefined)]
  }

  return args
}
