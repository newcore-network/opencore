/**
 * Database Module
 *
 * Provides a flexible database abstraction layer with pluggable adapters.
 * Uses oxmysql by default for FiveM environments.
 *
 * @example
 * ```typescript
 * import {
 *   DatabaseService,
 *   initDatabase,
 *   query,
 *   single,
 *   transaction,
 * } from '@open-core/framework/server'
 *
 * // Option 1: Use standalone functions
 * initDatabase()
 * const users = await query<User>('SELECT * FROM users')
 *
 * // Option 2: Use DI
 * @injectable()
 * class UserService {
 *   constructor(@inject(DatabaseService) private db: DatabaseService) {}
 *
 *   async findUser(id: number) {
 *     return this.db.single<User>('SELECT * FROM users WHERE id = ?', [id])
 *   }
 * }
 *
 * // Option 3: Use transactions (specific format)
 * const success = await transaction([
 *   { query: 'INSERT INTO orders (user_id) VALUES (?)', values: [userId] },
 *   { query: 'INSERT INTO order_items (order_id, product_id) VALUES (?, ?)', values: [orderId, productId] },
 * ])
 *
 * // Option 4: Use transactions (shared params format)
 * const success = await transaction(
 *   [
 *     'INSERT INTO orders (user_id) VALUES (@userid)',
 *     'UPDATE users SET order_count = order_count + 1 WHERE id = @userid',
 *   ],
 *   { userid: userId }
 * )
 * ```
 *
 * @see https://coxdocs.dev/oxmysql/Functions/transaction
 */

// Types
export type {
  DatabaseConfig,
  ExecuteResult,
  InsertResult,
  TransactionQuery,
  TransactionQueryTuple,
  TransactionSharedParams,
  TransactionInput,
  DatabaseAdapterFactory,
} from './types'

// Contract
export { DatabaseContract } from './database.contract'

// Service
export { DatabaseService } from './database.service'

// Standalone functions
export {
  getDatabaseService,
  initDatabase,
  query,
  single,
  scalar,
  execute,
  insert,
  transaction,
} from './database.service'

// Adapters
export { OxMySQLAdapter } from './adapters/oxmysql.adapter'
