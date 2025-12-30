/**
 * Repository Pattern Module
 *
 * Provides an abstract Repository base class for implementing
 * the Repository Pattern with type-safe CRUD operations.
 *
 * @example
 * ```typescript
 * import { Repository, FindOptions } from '@open-core/framework/server'
 * import { DatabaseContract } from '@open-core/framework/server'
 *
 * interface User {
 *   id: number
 *   name: string
 *   email: string
 *   active: boolean
 * }
 *
 * class UserRepository extends Repository<User> {
 *   protected tableName = 'users'
 *
 *   constructor(db: DatabaseContract) {
 *     super(db)
 *   }
 *
 *   protected toEntity(row: any): User {
 *     return {
 *       id: row.id,
 *       name: row.name,
 *       email: row.email,
 *       active: Boolean(row.active)
 *     }
 *   }
 *
 *   protected toRow(entity: User): Record<string, any> {
 *     return {
 *       id: entity.id,
 *       name: entity.name,
 *       email: entity.email,
 *       active: entity.active ? 1 : 0
 *     }
 *   }
 *
 *   // Custom methods
 *   async findByEmail(email: string): Promise<User | null> {
 *     return this.findOne({ email })
 *   }
 *
 *   async findActive(options?: FindOptions<User>): Promise<User[]> {
 *     const { data } = await this.findMany({ active: true }, options)
 *     return data
 *   }
 * }
 * ```
 */

// Contract
export { Repository } from './repository.contract'
// Types
export type {
  FindManyResult,
  FindOptions,
  OrderDirection,
  WhereCondition,
} from './repository.types'
