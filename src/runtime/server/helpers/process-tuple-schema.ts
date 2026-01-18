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

  const lastItem = items[items.length - 1]
  const positionalCount = items.length - 1

  // Case: More args than items (Greedy grouping)
  if (args.length > items.length) {
    // If last parameter is a string, join extra args with space
    if (lastItem instanceof z.ZodString) {
      const positional = args.slice(0, positionalCount)
      const restString = args.slice(positionalCount).join(' ')
      return [...positional, restString]
    }

    // If last parameter is an array, we keep them as individual elements
    // for the handler's spread operator (...args) or just as the array itself
    // if ZodTuple is being used to parse.
    // However, to avoid nesting [arg1, [arg2, arg3]], we return them flat
    // if the handler expects a spread, OR we return the array if it's a single param.
    if (lastItem instanceof z.ZodArray) {
      // For ZodTuple.parse() to work with a ZodArray at the end,
      // it actually expects the array as a single element in that position.
      const positional = args.slice(0, positionalCount)
      const restArray = args.slice(positionalCount)
      return [...positional, restArray]
    }
  }

  // Case: Exact match but last is array
  if (args.length === items.length) {
    if (lastItem instanceof z.ZodArray && !Array.isArray(args[positionalCount])) {
      const positional = args.slice(0, positionalCount)
      return [...positional, [args[positionalCount]]]
    }
  }

  return args
}
