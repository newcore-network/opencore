/**
 * Repository Pattern Types
 *
 * Types and interfaces for the generic repository pattern.
 */

/**
 * Sort direction for orderBy clauses
 */
export type OrderDirection = 'ASC' | 'DESC'

/**
 * Options for findMany queries with pagination, ordering, and field selection
 *
 * @example
 * ```typescript
 * const options: FindOptions<User> = {
 *   select: ['id', 'name', 'email'],
 *   orderBy: { createdAt: 'DESC' },
 *   limit: 10,
 *   offset: 0
 * }
 * ```
 */
export interface FindOptions<TEntity> {
  /** Fields to select (SELECT clause). If omitted, selects all fields (*) */
  select?: (keyof TEntity)[]
  /** Order by fields with direction */
  orderBy?: Partial<Record<keyof TEntity, OrderDirection>>
  /** Maximum number of records to return */
  limit?: number
  /** Number of records to skip (for pagination) */
  offset?: number
}

/**
 * Result of a findMany query with optional total count for pagination
 *
 * @example
 * ```typescript
 * const result = await userRepo.findMany({}, { limit: 10 })
 * console.log(`Showing ${result.data.length} of ${result.total} users`)
 * ```
 */
export interface FindManyResult<TEntity> {
  /** Array of entities matching the query */
  data: TEntity[]
  /** Total count of matching records (useful for pagination) */
  total?: number
}

/**
 * Where clause condition - partial entity for simple equality matching
 */
export type WhereCondition<TEntity> = Partial<TEntity>
