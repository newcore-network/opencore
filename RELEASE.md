## OpenCore Framework v0.3.0 ⚠️ BREAKING CHANGE

> **This release introduces massive structural simplifications, a hard boundary between runtimes, and a robust telemetry/logging system.**
> Backward compatibility with previous versions is **not guaranteed**.
> Please read the notes carefully before upgrading.

---

### Highlights

- **Dynamic Log Level Control (NEW)**  
  The framework now supports granular log level control. You can configure the global `logLevel` during `Server.init()`, which overrides build-time defaults. Supported levels: `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`, `OFF`.

- **Telemetry Bridge & State Inspection (NEW)**  
  Refactored the DevMode bridge to focus on telemetry. The OpenCore CLI can now stream logs and capture real-time snapshots of the framework state (DI container, active sessions, registered commands) via a WebSocket/HTTP bridge.

- **Offline Player Simulation (NEW)**  
  Enhanced the `PlayerSimulatorService` to allow testing complex game logic without a running game client. Supports automatic connection of virtual players on startup.

- **Zero-Config Feature System (NEW)**  
  Features are now enabled by default and providers are auto-inferred based on the runtime mode (`CORE`, `RESOURCE`, or `STANDALONE`). Manual provider configuration and export flags have been removed from the public API.

- **Universal Node.js Compatibility (NEW)**  
  Refactored core services (`ChatService`, `SessionController`) to remove direct dependencies on FiveM globals, enabling full framework testing and simulation in pure Node.js.

- **Hard runtime separation (Client / Server)**  
  OpenCore now enforces a strict boundary between client and server runtimes. Server-only code can no longer be accidentally bundled into client resources.

---

### 🚨 Breaking Changes

- **DevMode Refactor**:
  - Removed internal **Hot-Reload** server. Resource reloading is now handled exclusively by the OpenCore CLI or platform-native tools (txAdmin).
  - Removed `hotReload` property from `DevModeConfig`.
- **Imports**: now you only have 3 ways to imports, `@open-core/framework`, `@open-core/framework/server`, `@open-core/framework/client`
- **API Simplification**: `UserFeatureConfig` now only supports a `disabled` list. `provider` and `export` fields are removed.
- **Initialization**: `Server.init()` options have been simplified. `resourceGrants` has been entirely removed.
- **Package Exports**: The package root (`@open-core/framework`) now **only exposes kernel (runtime-agnostic) APIs**. Runtime-specific APIs **must** be imported via `@open-core/framework/client` or `@open-core/framework/server`.
- **Database Removal**: The internal `database` feature has been removed.
- **Logging Infrastructure**: `coreLogger` now uses a two-stage filtering system (Global vs. Transport). Environment detection is more strict.

---

### Changes

- **Core Simplification**:
  - Implemented `DefaultPrincipalProvider` for out-of-the-box `@Guard` support.
  - Refactored `ChatService` and `SessionController` for better platform independence.
  - Optimized `resolveRuntimeOptions` to build internal feature contracts automatically.
- **Logging & Telemetry**:
  - Implemented `__OPENCORE_LOG_LEVEL__` build-time injection.
  - Updated `LoggerService` with comprehensive TSDocs and dual-stage filtering logic.
  - Refactored `DevModeService` to focus on state inspection and telemetry.
- **Architectural Cleanup**:
  - Reorganized package exports so the kernel is the main public entrypoint.
  - Consolidated former `utils` into `kernel/shared/utils`.
  - Introduced explicit `api.ts` barrel files for both client and server runtimes.

---

### Migration Notes

If you are upgrading from **v0.2.x**, you will need to:

1. **Update Server Initialization**:
   ```ts
   // Old
   await Server.init({
     mode: 'CORE',
     features: { commands: { enabled: true, provider: 'local', export: true } },
   })

   // New (Sane defaults, dynamic logs)
   await Server.init({ 
     mode: 'CORE',
     logLevel: 'DEBUG' // Optional
   })
   ```

2. **Update Imports**:
   ```ts
   // Old
   import { X } from '@open-core/framework/kernel/di'
   
   // New
   import { X } from '@open-core/framework'
   import { Server } from '@open-core/framework/server'
   import { Client } from '@open-core/framework/client'
   ```

---

### Notes

This release establishes hard architectural boundaries and massive boilerplate reduction required for a stable, platform-agnostic multiplayer runtime as OpenCore grows.