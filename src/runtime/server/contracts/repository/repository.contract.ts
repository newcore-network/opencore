/**
 * Repository Contract
 *
 * Abstract base class for implementing the Repository Pattern.
 * Provides common CRUD operations with support for pagination, ordering, and field selection.
 *
 * @example
 * ```typescript
 * interface User {
 *   id: number
 *   name: string
 *   email: string
 *   createdAt: Date
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
 *       createdAt: new Date(row.created_at)
 *     }
 *   }
 *
 *   protected toRow(entity: User): Record<string, any> {
 *     return {
 *       id: entity.id,
 *       name: entity.name,
 *       email: entity.email,
 *       created_at: entity.createdAt.toISOString()
 *     }
 *   }
 * }
 *
 * // Usage
 * const userRepo = new UserRepository(db)
 * const user = await userRepo.findById(1)
 * const users = await userRepo.findMany({ active: true }, { limit: 10, orderBy: { createdAt: 'DESC' } })
 * ```
 */

import { DatabaseContract } from '../../database/database.contract'
import { FindManyResult, FindOptions, OrderDirection, WhereCondition } from './repository.types'

/**
 * Abstract Repository base class
 *
 * Extend this class to create type-safe repositories for your entities.
 *
 * @typeParam TEntity - The entity type this repository manages
 * @typeParam TId - The type of the primary key (defaults to number)
 */
export abstract class Repository<TEntity, TId = number> {
  /**
   * The database table name for this entity
   */
  protected abstract tableName: string

  /**
   * The primary key column name (defaults to 'id')
   */
  protected primaryKey: string = 'id'

  /**
   * Creates a new repository instance
   *
   * @param db - The database contract/service to use for queries
   */
  constructor(protected readonly db: DatabaseContract) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Abstract Methods - Must be implemented by subclasses
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Maps a database row to an entity instance
   *
   * @param row - Raw database row
   * @returns The mapped entity
   */
  protected abstract toEntity(row: any): TEntity

  /**
   * Maps an entity to a database row
   *
   * @param entity - The entity to map
   * @returns Object suitable for database operations
   */
  protected abstract toRow(entity: TEntity): Record<string, any>

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD Operations
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Find an entity by its primary key
   *
   * @param id - The primary key value
   * @returns The entity or null if not found
   *
   * @example
   * ```typescript
   * const user = await userRepo.findById(1)
   * if (user) {
   *   console.log(user.name)
   * }
   * ```
   */
  async findById(id: TId): Promise<TEntity | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`
    const row = await this.db.single(sql, [id])
    return row ? this.toEntity(row) : null
  }

  /**
   * Find a single entity matching the given conditions
   *
   * @param where - Conditions to match (equality only)
   * @returns The first matching entity or null
   *
   * @example
   * ```typescript
   * const user = await userRepo.findOne({ email: 'john@example.com' })
   * ```
   */
  async findOne(where: WhereCondition<TEntity>): Promise<TEntity | null> {
    const { clause, params } = this.buildWhereClause(where)
    const sql = `SELECT * FROM ${this.tableName}${clause} LIMIT 1`
    const row = await this.db.single(sql, params)
    return row ? this.toEntity(row) : null
  }

  /**
   * Find multiple entities with optional filtering, pagination, and ordering
   *
   * @param where - Optional conditions to filter by
   * @param options - Query options (select, orderBy, limit, offset)
   * @returns Result containing data array and optional total count
   *
   * @example
   * ```typescript
   * // Simple query
   * const { data: users } = await userRepo.findMany({ active: true })
   *
   * // With pagination and ordering
   * const result = await userRepo.findMany(
   *   { role: 'admin' },
   *   { limit: 10, offset: 20, orderBy: { createdAt: 'DESC' } }
   * )
   * console.log(`Page of ${result.data.length} admins`)
   * ```
   */
  async findMany(
    where?: WhereCondition<TEntity>,
    options?: FindOptions<TEntity>,
  ): Promise<FindManyResult<TEntity>> {
    const selectClause = this.buildSelectClause(options?.select)
    const { clause: whereClause, params } = this.buildWhereClause(where)
    const orderClause = this.buildOrderClause(options?.orderBy)
    const limitClause = this.buildLimitClause(options?.limit, options?.offset)

    const sql = `SELECT ${selectClause} FROM ${this.tableName}${whereClause}${orderClause}${limitClause}`
    const rows = await this.db.query(sql, params)
    const data = rows.map((row) => this.toEntity(row))

    // If pagination is used, also get total count
    let total: number | undefined
    if (options?.limit !== undefined) {
      total = await this.count(where)
    }

    return { data, total }
  }

  /**
   * Count entities matching the given conditions
   *
   * @param where - Optional conditions to filter by
   * @returns The count of matching entities
   *
   * @example
   * ```typescript
   * const activeCount = await userRepo.count({ active: true })
   * ```
   */
  async count(where?: WhereCondition<TEntity>): Promise<number> {
    const { clause, params } = this.buildWhereClause(where)
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName}${clause}`
    const result = await this.db.scalar<number>(sql, params)
    return result ?? 0
  }

  /**
   * Save an entity (insert if new, update if exists)
   *
   * If the entity has a primary key value, it will be updated.
   * Otherwise, a new record will be inserted.
   *
   * @param entity - The entity to save
   * @returns The saved entity with updated ID (for inserts)
   *
   * @example
   * ```typescript
   * // Insert new user
   * const newUser = await userRepo.save({ name: 'John', email: 'john@example.com' })
   * console.log(newUser.id) // Generated ID
   *
   * // Update existing user
   * user.name = 'John Doe'
   * await userRepo.save(user)
   * ```
   */
  async save(entity: TEntity): Promise<TEntity> {
    const row = this.toRow(entity)
    const id = row[this.primaryKey]

    if (id !== undefined && id !== null) {
      // Update existing entity
      await this.update(id as TId, row)
      return entity
    } else {
      // Insert new entity
      const insertedId = await this.insertRow(row)
      // Return entity with the new ID
      return this.toEntity({ ...row, [this.primaryKey]: insertedId })
    }
  }

  /**
   * Delete an entity by its primary key
   *
   * @param id - The primary key of the entity to delete
   * @returns true if deleted, false if not found
   *
   * @example
   * ```typescript
   * const deleted = await userRepo.delete(1)
   * if (deleted) {
   *   console.log('User deleted')
   * }
   * ```
   */
  async delete(id: TId): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`
    const result = await this.db.execute(sql, [id])
    return result.affectedRows > 0
  }

  /**
   * Delete entities matching the given conditions
   *
   * @param where - Conditions to match for deletion
   * @returns Number of deleted entities
   *
   * @example
   * ```typescript
   * const count = await userRepo.deleteWhere({ active: false })
   * console.log(`Deleted ${count} inactive users`)
   * ```
   */
  async deleteWhere(where: WhereCondition<TEntity>): Promise<number> {
    const { clause, params } = this.buildWhereClause(where)
    if (!clause) {
      throw new Error(
        'deleteWhere requires at least one condition to prevent accidental full table deletion',
      )
    }
    const sql = `DELETE FROM ${this.tableName}${clause}`
    const result = await this.db.execute(sql, params)
    return result.affectedRows
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Protected Helper Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Update an entity by ID
   */
  protected async update(id: TId, row: Record<string, any>): Promise<void> {
    const { [this.primaryKey]: _, ...updateData } = row
    const columns = Object.keys(updateData)
    const setClause = columns.map((col) => `${col} = ?`).join(', ')
    const values = columns.map((col) => updateData[col])

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ?`
    await this.db.execute(sql, [...values, id])
  }

  /**
   * Insert a new row and return the inserted ID
   */
  protected async insertRow(row: Record<string, any>): Promise<TId> {
    const { [this.primaryKey]: _, ...insertData } = row
    const columns = Object.keys(insertData)
    const placeholders = columns.map(() => '?').join(', ')
    const values = columns.map((col) => insertData[col])

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`
    const result = await this.db.insert(sql, values)
    return result.insertId as TId
  }

  /**
   * Build SELECT clause from field selection
   */
  protected buildSelectClause(select?: (keyof TEntity)[]): string {
    if (!select || select.length === 0) {
      return '*'
    }
    return select.map((field) => String(field)).join(', ')
  }

  /**
   * Build WHERE clause from conditions
   */
  protected buildWhereClause(where?: WhereCondition<TEntity>): { clause: string; params: any[] } {
    if (!where || Object.keys(where).length === 0) {
      return { clause: '', params: [] }
    }

    const conditions: string[] = []
    const params: any[] = []

    for (const [key, value] of Object.entries(where)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`)
      } else if (value === undefined) {
      } else {
        conditions.push(`${key} = ?`)
        params.push(value)
      }
    }

    if (conditions.length === 0) {
      return { clause: '', params: [] }
    }

    return {
      clause: ` WHERE ${conditions.join(' AND ')}`,
      params,
    }
  }

  /**
   * Build ORDER BY clause from orderBy options
   */
  protected buildOrderClause(orderBy?: Partial<Record<keyof TEntity, OrderDirection>>): string {
    if (!orderBy || Object.keys(orderBy).length === 0) {
      return ''
    }

    const orders = Object.entries(orderBy)
      .filter(([_, direction]) => direction)
      .map(([field, direction]) => `${field} ${direction}`)

    if (orders.length === 0) {
      return ''
    }

    return ` ORDER BY ${orders.join(', ')}`
  }

  /**
   * Build LIMIT/OFFSET clause
   */
  protected buildLimitClause(limit?: number, offset?: number): string {
    if (limit === undefined) {
      return ''
    }

    let clause = ` LIMIT ${limit}`
    if (offset !== undefined && offset > 0) {
      clause += ` OFFSET ${offset}`
    }
    return clause
  }
}
