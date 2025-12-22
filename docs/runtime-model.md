# Runtime Model: Client / Server / Shared

This document defines **non-negotiable boundaries** between client-side and server-side code, and how “shared” code should be designed.

These rules protect the long-term architecture and prevent invisible coupling.

---

## 1. Definitions

OpenCore is split into layers with different allowed dependencies:

- **Server runtime**: `src/runtime/server/**`
- **Client runtime**: `src/runtime/client/**`
- **Kernel (Shared)**: `src/kernel/**` (platform-agnostic infrastructure)
- **Adapters**: `src/adapters/**` (platform bridge contracts + implementations)

In the published package, you typically import:

- `@open-core/framework/server`
- `@open-core/framework/client`
- `@open-core/framework/shared`
- `@open-core/framework/utils`

---

## 2. Import rules

### 2.1 Shared (Kernel) rules

Shared code (Kernel) must be **platform-agnostic**.

- **Allowed**:
  - TypeScript/JavaScript standard library
  - other Kernel modules
  - framework utilities that do not depend on FiveM runtime
- **Not allowed**:
  - FiveM natives (`RegisterCommand`, `PlayerPedId`, `GetPlayerName`, etc.)
  - `src/runtime/server/**`
  - `src/runtime/client/**`
  - direct access to `globalThis.exports` (resource exports)

If this rule is broken, the code may compile but will:

- fail in environments where those globals do not exist
- become impossible to test outside FiveM

### 2.2 Server rules

Server runtime code may depend on:

- Kernel
- Adapters (contracts + server implementations)
- Server runtime modules

Server runtime must not import:

- client runtime modules (`src/runtime/client/**`)

If this rule is broken, you get:

- missing natives at runtime
- mixed execution assumptions
- circular dependencies that only fail under load

### 2.3 Client rules

Client runtime code may depend on:

- Kernel
- Adapters (contracts + client implementations)
- Client runtime modules

Client runtime must not import:

- server runtime modules (`src/runtime/server/**`)

If this rule is broken, you get:

- runtime crashes due to missing server-only globals
- broken bundling or incorrect side effects

---

## 3. Communication model

Client and server communicate strictly through explicit channels.

### 3.1 Network events

- Server listens using `@Server.OnNet(...)`.
- Client listens using `@Client.OnNet(...)`.

Rules:

- Net event payloads are untrusted input.
- The server should validate inputs (Zod schemas) before executing logic.

### 3.2 Exports (resource-to-resource)

Exports are for calling code across FiveM resources.

- Server export: `@Server.Export(name?)`
- Client export: `@Client.Export(name?)`

Rule:

- Exports are a coupling point. Prefer them only for cross-resource integration.

### 3.3 Internal framework events (server-only)

Internal framework events (`emitFrameworkEvent` / `@Server.OnFrameworkEvent`) are **server-local**, not networked.

Rule:

- Use internal events for decoupling services/controllers inside the server runtime.

---

## 4. What happens when you break the model

Breaking the runtime boundaries typically leads to:

- **Silent runtime failures** (undefined natives, missing `exports`, missing `source`)
- **Initialization races** (handlers registered in wrong order, decorators not imported)
- **Non-deterministic bugs** (“works sometimes”)
- **Testing impossibility** (Kernel is no longer portable)

When you see intermittent behavior, check:

- Was the module imported before bootstrap scan?
- Are you emitting events before listeners exist?
- Are you using server-only APIs on client (or the inverse)?

---

## 5. Practical guidelines

- Keep “shared” code restricted to:
  - pure types
  - pure logic
  - contracts
  - utilities
- Put FiveM interaction behind:
  - adapters
  - runtime services/controllers
- Prefer communication through:
  - `@OnNet` + schemas for client/server
  - internal events for server-side decoupling
