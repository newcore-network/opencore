import z from 'zod'

/**
 * Processes tuple schema validation with greedy handling for rest parameters.
 *
 * This function handles two cases:
 * 1. If last parameter is ZodArray and there are MORE args than schema items,
 *    collect the extra args into the array position.
 * 2. If last parameter is ZodString and there are MORE args than schema items,
 *    join the extra args into a single string.
 *
 * Examples:
 * - handler(player, action: string, ...rest: string[]) with args ["hello", "world", "!"]
 *   → schema is [z.string(), z.array(z.string())] (2 items)
 *   → args has 3 items, so we group extra: ["hello", ["world", "!"]]
 *
 * - handler(player, command: string, args: string[]) with args ["vida", ["arg1"]]
 *   → schema is [z.string(), z.array(z.string())] (2 items)
 *   → args has 2 items, matches schema, no processing needed
 */
export function processTupleSchema(schema: z.ZodTuple, args: any[]): any[] {
  const items = schema.description ? [] : ((schema as any)._def.items as z.ZodTypeAny[])

  if (items.length === 0) {
    return args
  }

  // Only process if we have MORE args than schema expects
  // This means we need to group extra args into the last position
  if (args.length <= items.length) {
    return args
  }

  const lastItem = items[items.length - 1]
  const positionalCount = items.length - 1

  // If last parameter is an array type, collect extra args into it
  if (lastItem instanceof z.ZodArray) {
    const positional = args.slice(0, positionalCount)
    const restArray = args.slice(positionalCount)
    return [...positional, restArray]
  }

  // If last parameter is a string, join extra args with space
  if (lastItem instanceof z.ZodString) {
    const positional = args.slice(0, positionalCount)
    const restString = args.slice(positionalCount).join(' ')
    return [...positional, restString]
  }

  return args
}
