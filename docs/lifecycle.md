# Framework Lifecycle (Critical)

This document describes the **actual runtime lifecycle** of OpenCore, and answers the questions that most frequently cause “it sometimes works” bugs:

- When decorators are registered
- When services exist (and when they are instantiated)
- When `Player` exists
- When it is safe to emit/listen to events
- What changes on reload/restart

The details below reflect the current implementation in:

- `src/runtime/server/bootstrap.ts`
- `src/runtime/server/services/services.register.ts`
- `src/kernel/di/metadata.scanner.ts`
- `src/runtime/server/controllers/session.controller.ts`
- `src/runtime/server/bus/core-event-bus.ts`

---

## 1. Big picture

OpenCore wiring happens in two phases:

- **Registration phase:** modules are imported, decorators run, metadata and registries are populated.
- **Binding phase:** the framework scans metadata and binds it to the runtime (FiveM events, net events, commands, exports, ticks, internal framework events).

If a controller class is never imported, its decorators never run, and **it will not be discovered**.

---

## 2. Server lifecycle

### 2.1 Entry point

The canonical server entry point is:

- `Server.init(options)` (`src/runtime/server/core.ts`)
  - resolves defaults (`resolveRuntimeOptions`)
  - calls `initServer(resolvedOptions)`

### 2.2 `initServer()` execution order

The current order in `src/runtime/server/bootstrap.ts` is:

1. **Validate runtime context**
   - `validateRuntimeContextOrThrow(options)`
   - `setRuntimeContext(options)`
2. **Register server capabilities (adapter layer)**
   - `registerServerCapabilities()`
3. **Register services into DI**
   - `registerServicesServer(ctx)`
   - At this point, services are **registered**, but not necessarily instantiated.
4. **Register decorator processors into DI**
   - `registerSystemServer(ctx)`
   - This registers processors such as `NetEventProcessor`, `FiveMEventProcessor`, `CoreEventProcessor`, etc.
   - It also registers default security contracts when net events are enabled.
5. **Provider checks (CORE / STANDALONE modes only)**
   - `checkProviders(ctx)` verifies required providers were configured in DI.
6. **Load framework controllers (internal OpenCore controllers)**
   - `loadFrameworkControllers(ctx)` imports framework controllers conditionally.
7. **Optional bootstrap validators (database)**
   - If database is enabled, validators are registered and executed.
8. **Scan controller registry and bind runtime**
   - `scanner.scan(getServerControllerRegistry())`
   - This is the moment where decorated methods actually become “live”.

### 2.3 When decorators are registered

Decorators are registered when their module is evaluated.

- `@Server.Controller()` registers the class in a controller registry (`getServerControllerRegistry()`), and marks it injectable.
- Method decorators like `@Server.OnNet`, `@Server.OnFiveMEvent`, `@Server.Command`, `@Server.OnFrameworkEvent`, `@Server.OnTick`, `@Server.Export` store metadata on the class prototype.

**Important:**

- Decorators are not “discovered” automatically by filesystem scanning.
- A controller is discoverable only if its module was imported (directly or indirectly) before `MetadataScanner.scan(...)`.

### 2.4 When services exist

Services exist in two different senses:

- **Registered in DI:** `registerServicesServer(ctx)` binds classes/contracts to the container.
- **Instantiated:** an actual instance is created when the container resolves it.

OpenCore registers services early (step 3), but instantiates them lazily.

### 2.5 When controllers and services are instantiated

`MetadataScanner.scan(registry)` (`src/kernel/di/metadata.scanner.ts`) does:

- For every controller class in the registry:
  - `container.resolve(ControllerClass)`
  - then it iterates over prototype methods
  - for each configured `DecoratorProcessor`, it reads metadata and binds handlers

This means:

- Controllers are instantiated **during scan**.
- Dependencies injected into controllers may also be instantiated during scan.

So in practice, a service that is injected into an active controller typically becomes instantiated at scan-time.

---

## 3. Player lifecycle (Server)

### 3.1 When `Player` exists

`Player` sessions are created by the framework’s `SessionController` (`src/runtime/server/controllers/session.controller.ts`).

On `playerJoining`:

- `clientId = source`
- `player = PlayerService.bind(clientId, { license })`
- persistence hooks are executed
- framework events are emitted:
  - `emitFrameworkEvent('core:playerSessionCreated', ...)`
  - later (async): `emitFrameworkEvent('core:playerFullyConnected', ...)`

On `playerDropped`:

- persistence save
- `PlayerService.unbindByClient(clientId)`
- `emitFrameworkEvent('core:playerSessionDestroyed', ...)`

### 3.2 What happens if a net event arrives before `Player` exists

The net-event pipeline checks the player session first.

In `NetEventProcessor` (`src/runtime/server/system/processors/netEvent.processor.ts`):

- if `playerService.getByClient(clientId)` returns `null`, the event is ignored.

So a common root cause of intermittent bugs is:

- Client emits a net event too early (before `playerJoining` has created a session).

---

## 4. Internal framework events

OpenCore internal events are handled via `core-event-bus` (`src/runtime/server/bus/core-event-bus.ts`):

- `onFrameworkEvent(event, handler)` registers a listener
- `emitFrameworkEvent(event, payload)` emits synchronously to registered handlers

### 4.1 When it is safe to emit internal events

You can call `emitFrameworkEvent(...)` at any time after the module is loaded.

However, **listeners registered via decorators** (`@Server.OnFrameworkEvent`) do not exist until:

- the controller module was imported, and
- `MetadataScanner.scan(...)` ran, and
- `CoreEventProcessor` registered handlers via `onFrameworkEvent(...)`

So:

- Emitting an internal event _before scan_ will do nothing for decorator-based listeners.

---

## 5. Decorator binding moment (the “framework becomes live” point)

The key moment is:

- `scanner.scan(getServerControllerRegistry())`

After scan completes:

- `@OnNet` handlers are bound to the net transport
- `@OnFiveMEvent` handlers are bound to engine events
- `@OnFrameworkEvent` handlers are bound to the internal bus
- `@Command` handlers are registered in `CommandService` (through the command processor)
- `@Export` methods are registered
- `@OnTick` methods are scheduled

Before scan completes:

- decorators may have stored metadata, but runtime bindings may not exist.

---

## 6. Reload / restart behavior

### 6.1 Resource restart (FiveM)

On a resource restart, the JavaScript runtime for that resource is reloaded and module state is recreated.

Practical implications:

- All in-memory registries and metadata in that resource are rebuilt.
- You must run `Server.init(...)` again.
- Previously registered handlers (net events, ticks, etc.) should be considered invalid and replaced by the new bootstrap.

### 6.2 RESOURCE mode dependencies

In `RESOURCE` mode, some features rely on the core resource being available.

Runtime validation enforces that core exports exist when needed (`validateRuntimeContextOrThrow`).

If core exports are unavailable, initialization fails with an explicit error.

---

## 7. Client lifecycle (high level)

Client lifecycle is similar but uses the client container and bootstrap:

- `Client.init()` calls `initClientCore()`.
- The client bootstrap registers singletons, registers processors, runs boot services (e.g. `SpawnService.init()`), runs loaders, then scans controller registry.

The important rule is the same:

- Decorator-based listeners do not exist until the scan has completed.
