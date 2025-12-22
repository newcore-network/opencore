import type { DatabaseContract } from './database.contract'

export type DatabaseAdapterFactoryFn = () => DatabaseContract

const factories = new Map<string, DatabaseAdapterFactoryFn>()

export function registerDatabaseAdapterFactory(name: string, factory: DatabaseAdapterFactoryFn) {
  if (factories.has(name)) {
    throw new Error(`[NewCore] Database adapter factory '${name}' is already registered`)
  }
  factories.set(name, factory)
}

export function resolveDatabaseAdapterFactory(name: string): DatabaseAdapterFactoryFn | undefined {
  return factories.get(name)
}
