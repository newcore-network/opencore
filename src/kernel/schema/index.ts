import { z } from 'zod'

/**
 * Infers the output type from a Zod schema.
 *
 * @example
 * ```ts
 * import { z, Infer } from '@open-core/framework'
 *
 * const UserSchema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 * })
 *
 * // In handler parameter
 * onEvent(player: Player, data: Infer<typeof UserSchema>) {
 *   data.name  // string
 *   data.age   // number
 * }
 * ```
 */
export type Infer<T extends z.ZodType> = z.infer<T>

/**
 * Infers the input type from a Zod schema.
 * Useful when schema has transforms that change the output type.
 */
export type Input<T extends z.ZodType> = z.input<T>

/**
 * Infers the output type from a Zod schema.
 * Alias for Infer<T>.
 */
export type Output<T extends z.ZodType> = z.output<T>

// Re-export Zod for convenience
// Developers can import { z } from '@open-core/framework' instead of 'zod'
export { z }
