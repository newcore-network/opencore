# Database and Persistence

This document explains OpenCore’s database and persistence philosophy.

It intentionally stays abstract: it does not force a specific SQL dialect or schema.

---

## 1. Philosophy

OpenCore separates:

- **Framework guarantees** (contracts, lifecycle hooks, adapter selection)
- **Project responsibilities** (schema design, migrations, queries, consistency)

The database layer is designed to support:

- a driver provided by another resource (adapter: `resource`)
- an in-process adapter such as oxmysql (adapter: `oxmysql`)
- custom adapters via registration

---

## 2. Database access: `DatabaseContract` and `DatabaseService`

### 2.1 The contract

All adapters implement `DatabaseContract` (`src/runtime/server/database/database.contract.ts`).

The contract exposes:

- `query<T>(sql, params?)`
- `single<T>(sql, params?)`
- `scalar<T>(sql, params?)`
- `execute(sql, params?)` (UPDATE/DELETE)
- `insert(sql, params?)`
- `transaction(queries, sharedParams?)`

The framework expects these operations to be:

- asynchronous
- safe to call concurrently
- rejecting on fatal failures (adapter-specific)

### 2.2 The service

`DatabaseService` (`src/runtime/server/database/database.service.ts`) is the framework-managed façade.

Key behaviors:

- lazy initialization (`ensureInitialized()` calls `initialize()` if needed)
- adapter selection via:
  - config (`initialize({ adapter: ... })`) or
  - convar `newcore_db_adapter`
- default factories are registered for:
  - `resource`
  - `oxmysql`

If no adapter is configured, `initialize()` throws.

---

## 3. Adapter selection and responsibility boundaries

### 3.1 What the framework guarantees

- consistent API via `DatabaseContract`
- predictable initialization errors when misconfigured
- a single façade (`DatabaseService`) used throughout runtime

### 3.2 What the framework does NOT guarantee

- schema existence
- migrations
- query correctness
- transactional correctness beyond what the adapter provides
- performance characteristics

Those remain project concerns.

---

## 4. How persistence fits into player sessions

Player persistence is a separate concept from “database access”.

OpenCore provides a persistence contract:

- `PlayerPersistenceContract` (`src/runtime/server/templates/persistence/player-persistence.contract.ts`)

The framework calls these hooks through `PlayerPersistenceService`:

- `onSessionLoad(player)`
- `onSessionSave(player)`
- `onAutoSave(player)`

Registration:

- your project registers a provider via `Server.setPersistenceProvider(MyProvider)` (`src/runtime/server/setup.ts`)

Important:

- persistence is called as part of the session lifecycle
- persistence should be idempotent and resilient

---

## 5. Async and error handling guidance

### 5.1 Database failures

Treat DB failures as expected operational failures.

Rules:

- do not crash the server for a single failed query
- use explicit error handling per operation
- log enough context to debug (query name, player id, operation)

### 5.2 Session persistence failures

`PlayerPersistenceService` catches and logs errors during load/save.

This means:

- a persistence failure should not automatically crash the server
- but your gameplay must handle missing data safely

---

## 6. Recommended patterns

- keep SQL out of controllers
- use repositories (`@Server.Repo()`) as the boundary around persistence
- keep persistence hooks thin and delegate to services/repositories
- always assume the DB can be temporarily unavailable

---

## 7. Anti-patterns

- Writing DB queries inside `@OnNet` handlers.
- Performing long transactions on tick handlers.
- Treating player session meta as persistent storage.
  - session meta is transient unless you explicitly save it.
