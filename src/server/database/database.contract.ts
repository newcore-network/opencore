/**
 * Database Contract
 *
 * Abstract base class that defines the interface for all database adapters.
 * Implement this contract to create custom database adapters.
 *
 * @example
 * ```typescript
 * class MyDatabaseAdapter extends DatabaseContract {
 *   async query<T>(sql: string, params?: any[]): Promise<T[]> {
 *     // Implementation
 *   }
 *   // ... other methods
 * }
 * ```
 */

import type {
  ExecuteResult,
  InsertResult,
  TransactionInput,
  TransactionSharedParams,
} from './types'

/**
 * Abstract contract for database adapters.
 *
 * All database adapters must extend this class and implement
 * all abstract methods to ensure consistent behavior across
 * different database backends.
 */
export abstract class DatabaseContract {
  /**
   * Execute a query and return all matching rows.
   *
   * @param sql - The SQL query string
   * @param params - Optional parameters for prepared statement
   * @returns Array of results
   *
   * @example
   * ```typescript
   * const users = await db.query<User>('SELECT * FROM users WHERE active = ?', [true])
   * ```
   */
  abstract query<T = any>(sql: string, params?: any[]): Promise<T[]>

  /**
   * Execute a query and return a single row.
   *
   * @param sql - The SQL query string
   * @param params - Optional parameters for prepared statement
   * @returns Single result or null if not found
   *
   * @example
   * ```typescript
   * const user = await db.single<User>('SELECT * FROM users WHERE id = ?', [userId])
   * if (user) {
   *   console.log(user.name)
   * }
   * ```
   */
  abstract single<T = any>(sql: string, params?: any[]): Promise<T | null>

  /**
   * Execute a query and return a single scalar value.
   *
   * @param sql - The SQL query string
   * @param params - Optional parameters for prepared statement
   * @returns Scalar value or null if not found
   *
   * @example
   * ```typescript
   * const count = await db.scalar<number>('SELECT COUNT(*) FROM users')
   * const name = await db.scalar<string>('SELECT name FROM users WHERE id = ?', [userId])
   * ```
   */
  abstract scalar<T = any>(sql: string, params?: any[]): Promise<T | null>

  /**
   * Execute an UPDATE or DELETE statement.
   *
   * @param sql - The SQL statement
   * @param params - Optional parameters for prepared statement
   * @returns Object containing affected rows count
   *
   * @example
   * ```typescript
   * const result = await db.execute('UPDATE users SET active = ? WHERE id = ?', [false, userId])
   * console.log(`Updated ${result.affectedRows} rows`)
   * ```
   */
  abstract execute(sql: string, params?: any[]): Promise<ExecuteResult>

  /**
   * Execute an INSERT statement.
   *
   * @param sql - The SQL insert statement
   * @param params - Optional parameters for prepared statement
   * @returns Object containing the inserted row ID
   *
   * @example
   * ```typescript
   * const result = await db.insert('INSERT INTO users (name, email) VALUES (?, ?)', ['John', 'john@example.com'])
   * console.log(`Inserted user with ID: ${result.insertId}`)
   * ```
   */
  abstract insert(sql: string, params?: any[]): Promise<InsertResult>

  /**
   * Execute multiple queries within a transaction.
   *
   * All queries are committed together if all succeed, or rolled back if any fails.
   *
   * **Specific format** - Each query has its own parameters:
   * ```typescript
   * await db.transaction([
   *   { query: 'INSERT INTO users (name) VALUES (?)', values: ['John'] },
   *   { query: 'INSERT INTO logs (action) VALUES (?)', values: ['user_created'] },
   * ])
   * ```
   *
   * **Shared format** - All queries share named parameters:
   * ```typescript
   * await db.transaction(
   *   [
   *     'INSERT INTO users (id, name) VALUES (@userid, @username)',
   *     'INSERT INTO profiles (user_id) VALUES (@userid)',
   *   ],
   *   { userid: 1, username: 'John' }
   * )
   * ```
   *
   * @param queries - Array of queries to execute
   * @param sharedParams - Optional shared parameters for all queries (named params format)
   * @returns true if transaction succeeded, false otherwise
   *
   * @see https://coxdocs.dev/oxmysql/Functions/transaction
   */
  abstract transaction(
    queries: TransactionInput,
    sharedParams?: TransactionSharedParams,
  ): Promise<boolean>
}
