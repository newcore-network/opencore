/**
 * OxMySQL Adapter
 *
 * Default database adapter using oxmysql resource for FiveM.
 * Requires oxmysql to be installed and running on the server.
 *
 * @see https://github.com/overextended/oxmysql
 * @see https://coxdocs.dev/oxmysql/Functions/transaction
 */

import { DatabaseContract } from '../database.contract'
import type {
  ExecuteResult,
  InsertResult,
  TransactionInput,
  TransactionQuery,
  TransactionSharedParams,
} from '../types'

/**
 * OxMySQL interface for FiveM exports
 */
interface OxMySQL {
  query_async: <T = any>(query: string, params?: any[]) => Promise<T[]>
  single_async: <T = any>(query: string, params?: any[]) => Promise<T | null>
  scalar_async: <T = any>(query: string, params?: any[]) => Promise<T | null>
  update_async: (query: string, params?: any[]) => Promise<number>
  insert_async: (query: string, params?: any[]) => Promise<number>
  transaction_async: (
    queries: TransactionQuery[] | string[],
    values?: TransactionSharedParams,
  ) => Promise<boolean>
}

/**
 * Get the oxmysql export from FiveM
 */
function getOxMySQL(): OxMySQL {
  const ox = exports['oxmysql'] as unknown as OxMySQL

  if (!ox) {
    throw new Error(
      '[OpenCore] oxmysql is not available. Make sure oxmysql resource is started before your resource.',
    )
  }

  return ox
}

/**
 * Normalize transaction input to oxmysql format
 */
function normalizeQueries(queries: TransactionInput): TransactionQuery[] | string[] {
  if (queries.length === 0) return []

  const first = queries[0]

  // String array - used with shared params
  if (typeof first === 'string') {
    return queries as string[]
  }

  // Tuple format: [query, values]
  if (Array.isArray(first)) {
    return (queries as [string, any[]?][]).map(([query, values]) => ({
      query,
      values,
    }))
  }

  // Already in TransactionQuery format
  return queries as TransactionQuery[]
}

/**
 * OxMySQL Database Adapter
 *
 * Implements DatabaseContract using oxmysql exports.
 *
 * @example
 * ```typescript
 * import { OxMySQLAdapter } from '@open-core/framework/server'
 *
 * // Usually you don't need to instantiate directly,
 * // use DatabaseService instead
 * const adapter = new OxMySQLAdapter()
 * const users = await adapter.query('SELECT * FROM users')
 * ```
 */
export class OxMySQLAdapter extends DatabaseContract {
  private ox: OxMySQL

  constructor() {
    super()
    this.ox = getOxMySQL()
  }

  /**
   * Execute a query and return all matching rows
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.ox.query_async<T>(sql, params)
    return result ?? []
  }

  /**
   * Execute a query and return a single row
   */
  async single<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await this.ox.single_async<T>(sql, params)
    return result ?? null
  }

  /**
   * Execute a query and return a single scalar value
   */
  async scalar<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await this.ox.scalar_async<T>(sql, params)
    return result ?? null
  }

  /**
   * Execute an UPDATE or DELETE statement
   */
  async execute(sql: string, params?: any[]): Promise<ExecuteResult> {
    const affectedRows = await this.ox.update_async(sql, params)
    return { affectedRows: affectedRows ?? 0 }
  }

  /**
   * Execute an INSERT statement
   */
  async insert(sql: string, params?: any[]): Promise<InsertResult> {
    const insertId = await this.ox.insert_async(sql, params)
    return { insertId: insertId ?? 0 }
  }

  /**
   * Execute multiple queries within a transaction.
   *
   * Supports three formats:
   *
   * **1. Specific format (object)**
   * ```typescript
   * await db.transaction([
   *   { query: 'INSERT INTO test (id) VALUES (?)', values: [1] },
   *   { query: 'INSERT INTO test (id, name) VALUES (?, ?)', values: [2, 'bob'] },
   * ])
   * ```
   *
   * **2. Specific format (tuple)**
   * ```typescript
   * await db.transaction([
   *   ['INSERT INTO test (id) VALUES (?)', [1]],
   *   ['INSERT INTO test (id, name) VALUES (?, ?)', [2, 'bob']],
   * ])
   * ```
   *
   * **3. Shared format (named parameters)**
   * ```typescript
   * await db.transaction(
   *   [
   *     'INSERT INTO test (id, name) VALUES (@someid, @somename)',
   *     'UPDATE test SET name = @newname WHERE id = @someid',
   *   ],
   *   {
   *     someid: 2,
   *     somename: 'John Doe',
   *     newname: 'John Notdoe',
   *   }
   * )
   * ```
   *
   * @see https://coxdocs.dev/oxmysql/Functions/transaction
   */
  async transaction(
    queries: TransactionInput,
    sharedParams?: TransactionSharedParams,
  ): Promise<boolean> {
    if (queries.length === 0) return true

    const normalizedQueries = normalizeQueries(queries)

    // Use shared params format if provided
    if (sharedParams) {
      return await this.ox.transaction_async(normalizedQueries as string[], sharedParams)
    }

    return await this.ox.transaction_async(normalizedQueries as TransactionQuery[])
  }
}
