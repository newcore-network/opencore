## OpenCore Framework v0.3.0 ⚠️ BREAKING CHANGE

> **This release introduces massive structural simplifications and a hard boundary between runtimes.**
> Backward compatibility with previous versions is **not guaranteed**.
> Please read the notes carefully before upgrading.

---

### Highlights

- **Zero-Config Feature System (NEW)**  
  Features are now enabled by default and providers are auto-inferred based on the runtime mode (`CORE`, `RESOURCE`, or `STANDALONE`). Manual provider configuration and export flags have been removed from the public API.

- **Universal Node.js Compatibility (NEW)**  
  Refactored core services (`ChatService`, `SessionController`) to remove direct dependencies on FiveM globals, enabling full framework testing and simulation in pure Node.js.

- **Hard runtime separation (Client / Server)**  
  OpenCore now enforces a strict boundary between client and server runtimes. Server-only code can no longer be accidentally bundled into client resources.

- **Kernel-first public API**  
  All runtime-agnostic logic has been consolidated into a single, safe `kernel` entrypoint exposed at the package root.

- **Minimalist Core**  
  Removed the internal `database` module and `resourceGrants` system to reduce framework bloat and prioritize specialized external libraries for persistence.

- **Smaller and cleaner client bundles**  
  Client bundles are significantly lighter after removing unintended server-side dependencies and Node-specific code.

---

### 🚨 Breaking Changes

- **API Simplification**: `UserFeatureConfig` now only supports a `disabled` list. `provider` and `export` fields are removed.
- **Initialization**: `Server.init()` options have been simplified. `resourceGrants` has been entirely removed.
- **Package Exports**: The package root (`@open-core/framework`) now **only exposes kernel (runtime-agnostic) APIs**. Runtime-specific APIs **must** be imported via `@open-core/framework/client` or `@open-core/framework/server`.
- **Database Removal**: The internal `database` feature, including `DatabaseService`, `DatabaseContract`, and built-in database adapters, has been removed.
- **Identity System**: `principal` is now enabled by default. In `CORE` and `STANDALONE` modes, a `PrincipalProvider` must be set or the framework will fallback to a `DefaultPrincipalProvider` (deny-all).
- **Decorators & Shared APIs**: Generic `runtime/index.ts` removed. Utils and Shared APIs have been deleted or moved to kernel.
- **Deep internal imports** (e.g. `@open-core/framework/kernel/...`) are **no longer supported** and will fail at build time.

---

### Changes

- **Core Simplification**:
  - Implemented `DefaultPrincipalProvider` for out-of-the-box `@Guard` support.
  - Refactored `ChatService` to use `INetTransport` contract instead of FiveM `emitNet` global.
  - Updated `SessionController` and `FiveMEngineEvents` to handle player lifecycle events via arguments instead of global `source`.
  - Optimized `resolveRuntimeOptions` to build internal feature contracts automatically.
- **Architectural Cleanup**:
  - Reorganized package exports so the kernel is the main public entrypoint.
  - Consolidated former `utils` into `kernel/shared/utils`.
  - Moved error and security-related types into `kernel/shared/utils/error`.
  - Introduced explicit `api.ts` barrel files for both client and server runtimes.
- **Refactors & Improvements**:
  - Renamed dependency injection container from `di` to `CONTAINER` (and subsequently `GLOBAL_CONTAINER` internally).
  - Renamed decorators for consistency and clarity (e.g., `OnFiveMEvent` -> `OnRuntimeEvent`).
  - Removed deprecated `auth`, `http`, and `config` features.
  - Migrated `Player` entity to use `BaseEntity` and `WorldContext`.
- Reorganized adapter contract interfaces into `client` and `server` subdirectories.
- Updated all FiveM and Node implementations, runtime services, entities, and tests to reflect the new contract structure.
- Improved import ordering (external dependencies first).
- Standardized file formatting across the codebase.

---

### Fixes

- Fixed a **critical bundler issue** where server-side code (including Node core modules) could be included in client bundles.
- Prevented runtime leakage caused by overly broad barrel exports.
- Enforced the package `exports` map to block invalid or unsupported subpath imports.
- Ensured client builds are free of `node:*` imports and server-only services.

---

### Migration Notes

If you are upgrading from **v0.2.x**, you will need to:

1. **Update Imports**:
   ```ts
   // Old
   import { X } from '@open-core/framework/kernel/di'
   
   // New
   import { X } from '@open-core/framework'
   import { Server } from '@open-core/framework/server'
   ```

2. **Update Server Initialization**:
   ```ts
   // Old
   await Server.init({
     mode: 'CORE',
     features: { commands: { enabled: true, provider: 'local', export: true } }
   })

   // New (Sane defaults, no manual feature config needed)
   await Server.init({ mode: 'CORE' })
   ```

3. **Database & Grants**:
   Migrate from built-in `DatabaseService` to external libraries (e.g., `oxmysql`). Remove `resourceGrants` from init options.

4. **Replace any deep internal imports with**:
   ```ts
   import { X } from '@open-core/framework'
   ```

5. **Import runtime-specific APIs explicitly**:
   ```ts
   import { Client } from '@open-core/framework/client'
   import { Server } from '@open-core/framework/server'
   ```

---

### Notes

This release establishes hard architectural boundaries and massive boilerplate reduction required for a stable, platform-agnostic multiplayer runtime as OpenCore grows.