import { DatabaseContract } from '../database.contract'
import type {
  ExecuteResult,
  InsertResult,
  TransactionInput,
  TransactionQuery,
  TransactionSharedParams,
} from '../types'

interface NewCoreDBExports {
  query_async: <T = any>(query: string, params?: any[]) => Promise<T[]>
  single_async: <T = any>(query: string, params?: any[]) => Promise<T | null>
  scalar_async: <T = any>(query: string, params?: any[]) => Promise<T | null>
  execute_async: (query: string, params?: any[]) => Promise<ExecuteResult>
  insert_async: (query: string, params?: any[]) => Promise<InsertResult>
  transaction_async: (
    queries: TransactionQuery[] | string[],
    values?: TransactionSharedParams,
  ) => Promise<boolean>
}

function getDbResourceName(): string {
  const name = GetConvar('newcore_db_resource', '').trim()
  if (!name) {
    throw new Error('[NewCore] newcore_db_resource is required when newcore_db_adapter=resource')
  }
  return name
}

function getDbExports(): NewCoreDBExports {
  const resourceName = getDbResourceName()
  const db = (exports as any)[resourceName] as NewCoreDBExports | undefined

  if (!db) {
    throw new Error(
      `[NewCore] Database resource '${resourceName}' is not available. Start it before this resource.`,
    )
  }

  return db
}

function normalizeQueries(queries: TransactionInput): TransactionQuery[] | string[] {
  if (queries.length === 0) return []

  const first = queries[0]

  if (typeof first === 'string') {
    return queries as string[]
  }

  if (Array.isArray(first)) {
    return (queries as [string, any[]?][]).map(([query, values]) => ({
      query,
      values,
    }))
  }

  return queries as TransactionQuery[]
}

export class ResourceDatabaseAdapter extends DatabaseContract {
  private db: NewCoreDBExports

  constructor() {
    super()
    this.db = getDbExports()
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.db.query_async<T>(sql, params)
    return result ?? []
  }

  async single<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await this.db.single_async<T>(sql, params)
    return result ?? null
  }

  async scalar<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await this.db.scalar_async<T>(sql, params)
    return result ?? null
  }

  async execute(sql: string, params?: any[]): Promise<ExecuteResult> {
    return await this.db.execute_async(sql, params)
  }

  async insert(sql: string, params?: any[]): Promise<InsertResult> {
    return await this.db.insert_async(sql, params)
  }

  async transaction(
    queries: TransactionInput,
    sharedParams?: TransactionSharedParams,
  ): Promise<boolean> {
    if (queries.length === 0) return true

    const normalizedQueries = normalizeQueries(queries)

    if (sharedParams) {
      return await this.db.transaction_async(normalizedQueries as string[], sharedParams)
    }

    return await this.db.transaction_async(normalizedQueries as TransactionQuery[])
  }
}
