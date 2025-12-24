# Contracts and Providers (SPI)

OpenCore exposes several **structural configuration points** through functions like:

- `Server.setPrincipalProvider(...)`
- `Server.setAuthProvider(...)`
- `Server.setSecurityHandler(...)`
- `Server.setNetEventSecurityObserver(...)`
- `Server.setPersistenceProvider(...)`

Even though they look like “setters”, they are not simple configuration toggles.

They define the concrete implementations that govern:

- identity and authorization
- authentication
- security enforcement
- event observation and abuse handling
- player persistence

You can think of this as OpenCore’s **Service Provider Interface (SPI)**.

---

## 1. What is a “contract”?

A **contract** is an abstract class (or interface-like abstraction) that defines _what the framework needs_, without dictating _how your game implements it_.

Examples:

- `PrincipalProviderContract`
- `AuthProviderContract`
- `SecurityHandlerContract`
- `NetEventSecurityObserverContract`
- `PlayerPersistenceContract`

OpenCore calls these contracts from its pipelines (guards, auth flows, net-event validation, session lifecycle).

---

## 2. What is a “provider”?

A **provider** is your concrete implementation of a contract.

Example:

- `class MyAuthProvider extends AuthProviderContract { ... }`

Providers are installed through the setup API (`src/runtime/server/setup.ts`).

---

## 3. When providers must be configured

Configure providers **before** calling `Server.init(...)`.

Reason:

- during bootstrap, the framework validates required providers and binds handlers.

If you configure providers after init, you risk:

- requests being processed with defaults
- missing authorization/authentication behavior
- non-deterministic “sometimes works” behavior

Reference:

- `docs/lifecycle.md`

---

## 4. Why providers are registered as classes (not instances)

All setup functions accept a **class**, not an object instance.

This is intentional.

Passing the class allows the framework to:

- construct it when needed
- keep a single authoritative instance (where appropriate)
- inject dependencies consistently

Rule:

- pass `MyProvider`, not `new MyProvider()`

---

## 5. What happens if a provider is not configured

It depends on the category:

- **Principal/Auth**
  - if the feature is enabled and marked as required, bootstrap throws and refuses to start.
- **Security handler / net-event observer**
  - defaults are installed automatically when net events are enabled.
- **Persistence**
  - if not configured, persistence is simply disabled.

---

# Provider categories

## A) Identity & Principal (Authorization)

### A.1 `PrincipalProviderContract`

#### Responsibility

Resolve the player’s **authorization identity**:

- roles
- permissions
- principal data needed by `@Guard`

This is authorization (what a player can do), not authentication (who the player is).

#### Minimal contract expected

`PrincipalProviderContract` defines:

- `getPrincipal(player): Promise<Principal | null>`
- `refreshPrincipal(player): Promise<void>`
- `getPrincipalByLinkedID(linkedID): Promise<Principal | null>`

#### How to configure

```ts
import { Server } from '@open-core/framework/server'

Server.setPrincipalProvider(MyPrincipalProvider)
```

#### Minimal example implementation

```ts
import { Server } from '@open-core/framework/server'

export class MyPrincipalProvider extends Server.PrincipalProviderContract {
  async getPrincipal(player: Server.Player) {
    if (!player.accountID) return null
    // return { rank: 1, permissions: ['inventory.use'] } // shape depends on Principal type
    return null
  }

  async refreshPrincipal(player: Server.Player) {
    // refresh cached permissions if you keep an in-memory cache
  }

  async getPrincipalByLinkedID(accountId: Server.LinkedID) {
    // resolve principal for offline workflows
    return null
  }
}
```

#### What happens if not configured

If principal is enabled and required, `Server.init(...)` fails with a fatal error instructing you to call:

- `Server.setPrincipalProvider(YourProvider)`

#### Common mistakes

- **Doing DB work on every request without caching**
  - `getPrincipal` can be called frequently.
- **Mixing authentication and authorization**
  - linking `accountID` is auth; permissions are principal.

---

## B) Authentication

### B.1 `AuthProviderContract`

#### Responsibility

Define the authentication flow:

- login
- register
- session validation
- logout

The provider typically links identity to the player session (e.g. via `player.linkAccount(...)`).

#### Minimal contract expected

`AuthProviderContract` defines:

- `authenticate(player, credentials): Promise<AuthResult>`
- `register(player, credentials): Promise<AuthResult>`
- `validateSession(player): Promise<AuthResult>`
- `logout(player): Promise<void>`

#### How to configure

```ts
import { Server } from '@open-core/framework/server'

Server.setAuthProvider(MyAuthProvider)
```

#### Minimal example implementation

```ts
import { Server } from '@open-core/framework/server'

export class MyAuthProvider extends Server.AuthProviderContract {
  async authenticate(player: Server.Player, credentials: Server.AuthCredentials) {
    // validate credentials (license / username+password / token ...)
    // player.linkAccount(accountId)
    return { success: true, accountID: 1 }
  }

  async register(player: Server.Player, credentials: Server.AuthCredentials) {
    return { success: false, error: 'Not implemented' }
  }

  async validateSession(player: Server.Player) {
    return { success: false, error: 'No session' }
  }

  async logout(player: Server.Player) {
    // clear auth state
  }
}
```

#### What happens if not configured

If auth is enabled and required, `Server.init(...)` fails with a fatal error instructing you to call:

- `Server.setAuthProvider(YourProvider)`

#### Common mistakes

- **Not linking the account**
  - if you never link identity, secure-by-default net events will be blocked.
- **Doing auth logic in controllers**
  - keep auth rules in the provider.

---

## C) Security

### C.1 `SecurityHandlerContract`

#### Responsibility

Defines what happens when the runtime detects a **security violation**, for example:

- invalid payloads
- schema mismatches
- abusive event patterns

The handler is responsible for policy decisions such as:

- log only
- warn
- kick
- ban

#### Minimal contract expected

- `handleViolation(player, error): Promise<void>`

#### How to configure

```ts
import { Server } from '@open-core/framework/server'

Server.setSecurityHandler(MySecurityHandler)
```

#### Minimal example implementation

```ts
import { Server } from '@open-core/framework/server'

export class MySecurityHandler extends Server.SecurityHandlerContract {
  async handleViolation(player: Server.Player, error: Server.SecurityError) {
    player.send('Security violation detected', 'error')
    // optionally: player.kick('Security violation')
  }
}
```

#### What happens if not configured

When net events are enabled, OpenCore installs a default handler.

#### Common mistakes

- **Throwing inside `handleViolation`**
  - treat it as a policy hook; it should be resilient.

---

### C.2 `NetEventSecurityObserverContract`

#### Responsibility

Observe invalid net-event payloads with full context.

Use it for:

- telemetry
- anti-cheat heuristics
- adaptive punishment policies

#### Minimal contract expected

- `onInvalidPayload(player, ctx): Promise<void>`

`ctx` includes:

- event name
- reason (`zod`, `arg_count`, `security_error`, ...)
- player id / account id
- invalid count

#### How to configure

```ts
import { Server } from '@open-core/framework/server'

Server.setNetEventSecurityObserver(MyObserver)
```

#### Minimal example implementation

```ts
import { Server } from '@open-core/framework/server'

export class MyObserver extends Server.NetEventSecurityObserverContract {
  async onInvalidPayload(player: Server.Player, ctx: Server.NetEventInvalidPayloadContext) {
    if ((ctx.invalidCount ?? 0) >= 5) {
      player.kick('Invalid network payloads')
    }
  }
}
```

#### What happens if not configured

When net events are enabled, OpenCore installs a default observer.

#### Common mistakes

- **Punishing on the first invalid payload**
  - network payloads can be corrupted; use thresholds.

---

## D) Persistence

### D.1 `PlayerPersistenceContract`

#### Responsibility

Defines how player data is persisted across sessions.

The framework calls persistence hooks during the session lifecycle:

- on join (load)
- on disconnect (save)
- optionally on interval (auto-save)

#### Minimal contract expected

`PlayerPersistenceContract` defines:

- `config` (`autoSaveEnabled`, `autoSaveIntervalMs`)
- `onSessionLoad(player)`
- `onSessionSave(player)`
- `onAutoSave(player)`

#### How to configure

```ts
import { Server } from '@open-core/framework/server'

Server.setPersistenceProvider(MyPersistenceProvider)
```

#### Minimal example implementation

```ts
import { Server } from '@open-core/framework/server'

export class MyPersistenceProvider extends Server.PlayerPersistenceContract {
  readonly config = {
    autoSaveEnabled: true,
    autoSaveIntervalMs: 300000,
  }

  async onSessionLoad(player: Server.Player) {
    // load domain state, then attach to your systems
    // player.setMeta('characterId', ...)
  }

  async onSessionSave(player: Server.Player) {
    // save domain state
  }

  async onAutoSave(player: Server.Player) {
    await this.onSessionSave(player)
  }
}
```

#### What happens if not configured

Persistence is disabled.

The internal persistence service checks whether a provider is available and becomes a no-op if not.

#### Common mistakes

- **Treating `player.setMeta(...)` as persistence**
  - meta is transient unless you explicitly save it.
- **Assuming auto-save is a transaction boundary**
  - auto-save is best-effort; design your persistence with failures in mind.
