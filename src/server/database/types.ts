/**
 * Database Module Types
 *
 * Core types for the database abstraction layer.
 */

/**
 * Result of an execute/update operation
 */
export interface ExecuteResult {
  /** Number of rows affected by the operation */
  affectedRows: number
}

/**
 * Result of an insert operation
 */
export interface InsertResult {
  /** The auto-generated ID of the inserted row */
  insertId: number
}

/**
 * Configuration for database adapters
 */
export interface DatabaseConfig {
  /** Adapter identifier (e.g., 'oxmysql', 'mysql-async') */
  adapter?: string
  /** Enable debug logging */
  debug?: boolean
  /** Connection timeout in milliseconds */
  timeout?: number
}

/**
 * Transaction query definition for oxmysql (specific format)
 *
 * @see https://coxdocs.dev/oxmysql/Functions/transaction
 */
export interface TransactionQuery {
  query: string
  /** Parameter values for the query (oxmysql uses 'values') */
  values?: any[]
}

/**
 * Transaction query as tuple format [query, values]
 */
export type TransactionQueryTuple = [string, any[]?]

/**
 * Shared parameters for transaction queries (named parameters format)
 *
 * @example
 * ```typescript
 * const params: TransactionSharedParams = {
 *   someid: 2,
 *   somename: 'John Doe',
 *   newname: 'John Notdoe'
 * }
 * ```
 */
export interface TransactionSharedParams {
  [key: string]: any
}

/**
 * Transaction input - can be specific format, tuple format, or just strings
 */
export type TransactionInput = TransactionQuery[] | TransactionQueryTuple[] | string[]

/**
 * Database adapter factory function type
 */
export type DatabaseAdapterFactory = () => import('./database.contract').DatabaseContract
