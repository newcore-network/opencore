## OpenCore Framework v1.0.5-beta.2

### Highlights
- Added an explicit server adapter API for platform-specific runtimes.
- Player creation and remote hydration now support adapter-owned subclasses while preserving the public `Player` type.
- Added an explicit client adapter API and removed the built-in `ClientPlayer` singleton.

### New Features
- `Server.init()` now accepts `adapter` to install a single server adapter during bootstrap.
- Added public server adapter helpers in `@open-core/framework/server` for custom adapter packages.
- Added adapter-aware Player serialization hooks for CORE/RESOURCE flows.
- `Client.init()` now accepts `adapter` to install a single client adapter during bootstrap.
- Added client runtime bridge contracts so event processors, NUI callbacks, key mappings, and ticks no longer depend directly on CFX globals.

### Breaking Changes
- Server bootstrap now defaults to the built-in Node adapter when no explicit runtime adapter is provided.
- Platform-specific Player APIs should move into adapter packages through Player subclassing/module augmentation.
- `ClientPlayer` is no longer exported from `@open-core/framework/client`.
- Client bootstrap no longer uses `register-client-capabilities`; external adapters should be installed through `Client.init({ adapter })`.

### Notes
- Migration path for external adapters:
  1. Create an adapter with `defineServerAdapter({ name, register(ctx) { ... } })`.
  2. Register platform contracts inside `register(ctx)` with `bindSingleton`, `bindInstance`, or `bindMessagingTransport`.
  3. If you extend `Player`, provide `ctx.usePlayerAdapter({ createLocal, createRemote, serialize, hydrate })`.
  4. Pass the adapter to `Server.init({ mode, adapter })` in both CORE and RESOURCE resources.
- RESOURCE hydration now validates adapter identity before rebuilding remote `Player` instances.
- Client adapter migration path:
  1. Create an adapter with `defineClientAdapter({ name, register(ctx) { ... } })`.
  2. Register transport, appearance, hashing, and runtime bridge contracts inside `register(ctx)`.
  3. Pass the adapter to `Client.init({ mode, adapter })`.
- Client files now safe to remove from core once moved to external adapter packages:
  - `src/adapters/register-client-capabilities.ts`
  - `src/adapters/fivem/fivem-ped-appearance-client.ts`
  - `src/adapters/redm/redm-ped-appearance-client.ts`
  - `src/adapters/node/node-ped-appearance-client.ts`
  - Any remaining client-only transport/runtime bindings that your external adapter reimplements.
