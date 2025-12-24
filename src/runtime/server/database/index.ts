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
export { ResourceDatabaseAdapter } from '../../../adapters/database/resource.adapter'
export { registerDatabaseAdapterFactory, resolveDatabaseAdapterFactory } from './adapter.registry'
