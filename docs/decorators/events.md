# Decorators: Events

This document covers event-related decorators.

Focus:

- communication
- data flow
- implicit security model

Not focus:

- internal implementation details

---

## 1. Network Events (Client ↔ Server)

### 1.1 `@Server.OnNet(eventName, options?)`

#### What it does

Declares a server handler for a client → server network event.

#### Data flow

- client emits a net event
- the framework resolves the target controller
- security/validation runs
- your handler receives:
  - `player: Server.Player` as first argument
  - validated payload args

#### Security model (important)

Net events are **secure by default**:

- if the handler is not marked `@Server.Public()`, the framework blocks unauthenticated calls

#### Minimal example

```ts
import { Server } from '@open-core/framework/server'
import { z } from 'zod'

@Server.Controller()
export class BankController {
  @Server.OnNet('bank:deposit', { schema: z.tuple([z.coerce.number().positive()]) })
  deposit(player: Server.Player, amount: number) {
    // ...
  }
}
```

#### Common mistakes

- emitting the net event before `Player` session exists
- relying on complex payloads without a schema

---

### 1.2 `@Server.Public()`

#### What it does

Marks a server net-event handler as publicly accessible (no auth required).

#### When to use it

Use only for:

- login / registration
- public reads

Do not use it for sensitive state mutations.

---

### 1.3 `@Client.OnNet(eventName)`

#### What it does

Declares a client handler for a server → client network event.

#### Minimal example

```ts
import { Client } from '@open-core/framework/client'

@Client.Controller()
export class UiController {
  @Client.OnNet('ui:setVisible')
  setVisible(visible: boolean) {
    // ...
  }
}
```

---

## 2. Internal Framework Events (Server-only)

### 2.1 `@Server.OnFrameworkEvent(event)`

#### What it does

Declares a handler for internal server-local framework events.

These events do not go over the network.

#### When it is safe

Decorator-based listeners exist only after bootstrap scanning.

Reference:

- `docs/lifecycle.md`

#### Minimal example

```ts
import { Server } from '@open-core/framework/server'

@Server.Controller()
export class WelcomeController {
  @Server.OnFrameworkEvent('core:playerFullyConnected')
  onPlayerFullyConnected(payload: { clientId: number; license?: string }) {
    // ...
  }
}
```

---

## 3. FiveM Engine Events (Server-only)

### `@Server.OnFiveMEvent(eventName)`

Declares a handler for a native FiveM server event (e.g. `playerJoining`, `playerDropped`).

Use it for:

- lifecycle events
- engine signals

Avoid using it as an application bus.

---

## 4. Ticks (Recurring execution)

### 4.1 Server: `@Server.OnTick()`

Runs every server tick. Keep handlers lightweight.

### 4.2 Client: `@Client.Tick()`

Runs every client frame. Keep handlers lightweight.

### 4.3 Client: `@Client.Interval(ms)`

Runs at a fixed cadence. Use it for periodic work.

---

## 5. Rule of thumb

- Use net events for client/server communication.
- Use framework events for server-local decoupling.
- Use engine events for platform lifecycle.
- Treat ticks as “budgeted time”, not a general scheduler.
