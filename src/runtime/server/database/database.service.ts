import { injectable } from 'tsyringe'
import { OxMySQLAdapter } from '../../../adapters/database/oxmysql.adapter'
import { ResourceDatabaseAdapter } from '../../../adapters/database/resource.adapter'
import { registerDatabaseAdapterFactory, resolveDatabaseAdapterFactory } from './adapter.registry'
import { DatabaseContract } from './database.contract'
import {
  DatabaseConfig,
  ExecuteResult,
  InsertResult,
  TransactionInput,
  TransactionSharedParams,
} from './types'

let defaultFactoriesRegistered = false

function registerDefaultDatabaseFactories(): void {
  if (defaultFactoriesRegistered) return
  registerDatabaseAdapterFactory('resource', () => new ResourceDatabaseAdapter())
  registerDatabaseAdapterFactory('oxmysql', () => new OxMySQLAdapter())
  defaultFactoriesRegistered = true
}

@injectable()
export class DatabaseService extends DatabaseContract {
  private adapter: DatabaseContract | null = null
  private isInitialized = false

  /**
   * Initialize the database service with optional configuration
   *
   * @param config - Database configuration options
   */
  initialize(config: DatabaseConfig = {}): void {
    if (this.isInitialized) return

    registerDefaultDatabaseFactories()

    if (!this.adapter) {
      const adapterName =
        config.adapter?.trim() || globalThis.GetConvar?.('opencore_db_adapter', '') || ''

      if (!adapterName) {
        throw new Error(
          "[OpenCore] Database adapter is not configured. Set 'opencore_db_adapter' (recommended: 'resource') or call initDatabase({ adapter: 'resource' }).",
        )
      }

      const factory = resolveDatabaseAdapterFactory(adapterName)
      if (!factory) {
        throw new Error(
          `[OpenCore] Unknown database adapter '${adapterName}'. Register it via registerDatabaseAdapterFactory('${adapterName}', factory).`,
        )
      }

      this.adapter = factory()
    }

    this.isInitialized = true
  }
  /**
   * Check if the service is initialized
   */
  get initialized(): boolean {
    return this.isInitialized
  }

  /**
   * Register a custom database adapter
   *
   * @param adapter - Custom adapter implementing DatabaseContract
   *
   * @example
   * ```typescript
   * class CustomAdapter extends DatabaseContract {
   *   // Implementation
   * }
   *
   * db.setAdapter(new CustomAdapter())
   * ```
   */
  setAdapter(adapter: DatabaseContract): void {
    this.adapter = adapter
  }

  /**
   * Get the current adapter
   */
  getAdapter(): DatabaseContract {
    return this.getInitializedAdapter()
  }

  /**
   * Ensure the service is initialized and return the adapter
   */
  private getInitializedAdapter(): DatabaseContract {
    if (!this.isInitialized) {
      this.initialize()
    }

    if (!this.adapter) {
      throw new Error('[OpenCore] Database adapter not initialized')
    }

    return this.adapter
  }

  /**
   * Execute a query and return all matching rows
   */
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return this.getInitializedAdapter().query<T>(sql, params)
  }

  /**
   * Execute a query and return a single row
   */
  async single<T = any>(sql: string, params?: any[]): Promise<T | null> {
    return this.getInitializedAdapter().single<T>(sql, params)
  }

  /**
   * Execute a query and return a single scalar value
   */
  async scalar<T = any>(sql: string, params?: any[]): Promise<T | null> {
    return this.getInitializedAdapter().scalar<T>(sql, params)
  }

  /**
   * Execute an UPDATE or DELETE statement
   */
  async execute(sql: string, params?: any[]): Promise<ExecuteResult> {
    return this.getInitializedAdapter().execute(sql, params)
  }

  /**
   * Execute an INSERT statement
   */
  async insert(sql: string, params?: any[]): Promise<InsertResult> {
    return this.getInitializedAdapter().insert(sql, params)
  }

  /**
   * Execute multiple queries within a transaction
   */
  async transaction(
    queries: TransactionInput,
    sharedParams?: TransactionSharedParams,
  ): Promise<boolean> {
    return this.getInitializedAdapter().transaction(queries, sharedParams)
  }
}

// Singleton instance for standalone usage
let databaseServiceInstance: DatabaseService | null = null

/**
 * Get the global DatabaseService instance
 *
 * @returns The singleton DatabaseService instance
 *
 * @example
 * ```typescript
 * import { getDatabaseService } from '@open-core/framework/server'
 *
 * const db = getDatabaseService()
 * const users = await db.query('SELECT * FROM users')
 * ```
 */
export function getDatabaseService(): DatabaseService {
  if (!databaseServiceInstance) {
    databaseServiceInstance = new DatabaseService()
  }
  return databaseServiceInstance
}

/**
 * Initialize the database service
 *
 * @param config - Database configuration options
 *
 * @example
 * ```typescript
 * import { initDatabase } from '@open-core/framework/server'
 *
 * // Initialize with default oxmysql adapter
 * initDatabase()
 *
 * // Or with custom config
 * initDatabase({ debug: true })
 * ```
 */
export function initDatabase(config: DatabaseConfig = {}): void {
  getDatabaseService().initialize(config)
}

/**
 * Standalone query function
 *
 * @example
 * ```typescript
 * import { query } from '@open-core/framework/server'
 *
 * const users = await query<User>('SELECT * FROM users WHERE active = ?', [true])
 * ```
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  return getDatabaseService().query<T>(sql, params)
}

/**
 * Standalone single function
 *
 * @example
 * ```typescript
 * import { single } from '@open-core/framework/server'
 *
 * const user = await single<User>('SELECT * FROM users WHERE id = ?', [userId])
 * ```
 */
export async function single<T = any>(sql: string, params?: any[]): Promise<T | null> {
  return getDatabaseService().single<T>(sql, params)
}

/**
 * Standalone scalar function
 *
 * @example
 * ```typescript
 * import { scalar } from '@open-core/framework/server'
 *
 * const count = await scalar<number>('SELECT COUNT(*) FROM users')
 * ```
 */
export async function scalar<T = any>(sql: string, params?: any[]): Promise<T | null> {
  return getDatabaseService().scalar<T>(sql, params)
}

/**
 * Standalone execute function
 *
 * @example
 * ```typescript
 * import { execute } from '@open-core/framework/server'
 *
 * const result = await execute('UPDATE users SET active = ? WHERE id = ?', [false, userId])
 * console.log(`Updated ${result.affectedRows} rows`)
 * ```
 */
export async function execute(sql: string, params?: any[]): Promise<ExecuteResult> {
  return getDatabaseService().execute(sql, params)
}

/**
 * Standalone insert function
 *
 * @example
 * ```typescript
 * import { insert } from '@open-core/framework/server'
 *
 * const result = await insert('INSERT INTO users (name) VALUES (?)', ['John'])
 * console.log(`Inserted with ID: ${result.insertId}`)
 * ```
 */
export async function insert(sql: string, params?: any[]): Promise<InsertResult> {
  return getDatabaseService().insert(sql, params)
}

/**
 * Standalone transaction function
 *
 * Execute multiple queries atomically. All succeed or all fail.
 *
 * @example Specific format (each query has its own params)
 * ```typescript
 * import { transaction } from '@open-core/framework/server'
 *
 * const success = await transaction([
 *   { query: 'INSERT INTO users (name) VALUES (?)', values: ['John'] },
 *   { query: 'INSERT INTO logs (action) VALUES (?)', values: ['user_created'] },
 * ])
 * ```
 *
 * @example Tuple format
 * ```typescript
 * const success = await transaction([
 *   ['INSERT INTO users (name) VALUES (?)', ['John']],
 *   ['INSERT INTO logs (action) VALUES (?)', ['user_created']],
 * ])
 * ```
 *
 * @example Shared format (named parameters)
 * ```typescript
 * const success = await transaction(
 *   [
 *     'INSERT INTO users (id, name) VALUES (@userid, @username)',
 *     'INSERT INTO profiles (user_id) VALUES (@userid)',
 *   ],
 *   { userid: 1, username: 'John' }
 * )
 * ```
 *
 * @see https://coxdocs.dev/oxmysql/Functions/transaction
 */
export async function transaction(
  queries: TransactionInput,
  sharedParams?: TransactionSharedParams,
): Promise<boolean> {
  return getDatabaseService().transaction(queries, sharedParams)
}
