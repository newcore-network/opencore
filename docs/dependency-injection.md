# Dependency Injection and Decorators

OpenCore uses **tsyringe** as its dependency injection container.

This document explains:

- how DI works in OpenCore
- what scopes exist in practice
- when to use `@Service`, `@Repo`, `@Controller`, `@Bind`
- common mistakes that cause subtle runtime issues

---

## 1. The DI container

OpenCore exposes a DI container:

- `di` is the tsyringe `container` (`src/kernel/di/container.ts`)

The container is responsible for:

- creating class instances
- injecting constructor parameters
- applying lifecycles (singleton / resolution-scoped)

---

## 2. How decorators relate to DI

### 2.1 `@Server.Controller()` / `@Client.Controller()`

The controller decorator does three important things:

- marks the class as `@injectable()` so it can be constructed by the container
- stores controller metadata (server vs client)
- registers the class in an internal controller registry

Controllers are instantiated when the framework scans the registry:

- `MetadataScanner.scan(registry)` resolves each controller class from DI

### 2.2 `@Server.Service()` / `@Server.Repo()`

`@Service()` and `@Repo()` are convenience wrappers over `@Bind()`.

They exist to:

- register classes as injectable
- apply a lifecycle
- provide clear semantic intent (business logic vs persistence)

### 2.3 `@Server.Bind(scope)`

`Bind` is the low-level lifecycle decorator.

- `scope: 'singleton'` uses tsyringe `@singleton()`
- `scope: 'transient'` uses tsyringe `@scoped(Lifecycle.ResolutionScoped)`

Important nuance:

- The `'transient'` option maps to **ResolutionScoped**, meaning:
  - you get one instance per resolution scope (per top-level `container.resolve(...)` call)
  - not necessarily a new instance for every injection at all times

---

## 3. When services “exist”

Services exist in two phases:

1. **Registered:** the class is known to the container.
2. **Instantiated:** the container has created an instance.

OpenCore often registers services early (during bootstrap), but instantiates them lazily.

However, services can be instantiated during bootstrap because controllers are resolved during scanning, and controllers require their dependencies.

---

## 4. Common mistakes (and why they happen)

### 4.1 Creating services manually with `new`

If you do `new MyService()`:

- dependencies are not injected
- singleton guarantees are broken
- state becomes duplicated and inconsistent

Correct approach:

- inject via constructor
- or resolve via `di.resolve(MyService)` when truly needed

### 4.2 Using framework runtime before init

Server runtime requires initialization:

- `Server.init(...)` sets the runtime context and bootstraps processors and bindings

If you call server runtime APIs before init, you can hit explicit errors such as:

- `RuntimeContext is not initialized...`

### 4.3 Decorators never run because module is never imported

Decorators execute when the module is evaluated.

If your controller file is never imported, it will not be registered in the controller registry, and scanning will never see it.

This is one of the most common sources of “it sometimes works”.

### 4.4 Emitting events before listeners exist

Decorator-based listeners are bound only after scanning.

- Emitting internal events before `MetadataScanner.scan(...)` means decorator listeners are not connected yet.

---

## 5. Practical usage recommendations

- Use `@Server.Controller()` / `@Client.Controller()` for entry points (net events, commands, ticks).
- Use `@Server.Service()` for business logic.
- Use `@Server.Repo()` for persistence boundaries.
- Use `@Server.Bind('transient')` for resolution-scoped components where you need per-request/per-resolution isolation.
- Avoid manual instantiation and avoid hidden imports.
