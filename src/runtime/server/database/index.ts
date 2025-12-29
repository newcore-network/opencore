// Types

// Adapters
export { ResourceDatabaseAdapter } from '../../../adapters/database/resource.adapter'
export { registerDatabaseAdapterFactory, resolveDatabaseAdapterFactory } from './adapter.registry'
// Contract
export { DatabaseContract } from './database.contract'
// Service
// Standalone functions
export {
  DatabaseService,
  execute,
  getDatabaseService,
  initDatabase,
  insert,
  query,
  scalar,
  single,
  transaction,
} from './database.service'
export type {
  DatabaseAdapterFactory,
  DatabaseConfig,
  ExecuteResult,
  InsertResult,
  TransactionInput,
  TransactionQuery,
  TransactionQueryTuple,
  TransactionSharedParams,
} from './types'
