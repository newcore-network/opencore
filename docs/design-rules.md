# Design Rules and Anti-Patterns

This document is intentionally opinionated.

OpenCore works best when the codebase stays aligned with a few hard rules. These rules prevent invisible coupling and reduce long-term maintenance cost.

---

## 1. What must NOT go in Core (framework core)

Do not put gameplay rules into OpenCore framework internals.

Avoid:

- job systems
- economy logic
- inventory logic
- faction logic
- “business defaults” (tax rates, spawn points, etc.)

Framework core should provide:

- primitives (events, DI, player/session abstraction)
- contracts (providers/adapters)
- safe execution pipeline (validation, security, scheduling)

---

## 2. What must NOT go in Controllers

Controllers are integration entry points.

Controllers should:

- validate / parse input (or declare schemas)
- enforce security via decorators
- call services

Controllers should not:

- contain heavy business logic
- perform database queries directly
- implement long workflows
- hold long-lived state

If you put business logic in controllers, you will eventually duplicate it across:

- net events
- commands
- exports

---

## 3. What a Service must NOT do

Services should represent cohesive business capabilities.

Services should not:

- call FiveM natives directly (prefer adapters or dedicated runtime services)
- depend on global variables such as `source`
- emit unvalidated net events as a hidden side effect

A service should accept explicit inputs:

- `player: Server.Player`
- `accountId: string`
- DTOs that are already validated

---

## 4. What a Repository must NOT do

Repositories are persistence boundaries.

Repositories should:

- encapsulate database access
- return domain objects or plain data

Repositories should not:

- contain gameplay rules
- call net events
- depend on controller context

---

## 5. Avoid hidden module imports

If a controller is not imported, its decorators never run.

Rules:

- Ensure every controller module is imported before bootstrap scanning.
- Prefer a single “controllers index” import that imports all controllers.

Hidden imports are the most common source of:

- missing handlers
- “sometimes registered” commands
- missing event listeners

---

## 6. Avoid using session meta as a database

Session meta is:

- transient
- process-local
- reset on restart

Do not treat it as persistent player data.

If data must survive restart, it belongs in:

- persistence provider
- repositories

---

## 7. Avoid mixing client and server logic

Do not import server runtime modules into client runtime (and vice versa).

If you break the boundary, you get:

- undefined globals
- execution assumptions that only fail under load
- hard-to-debug circular dependencies

---

## 8. Avoid emitting events before the framework is live

Decorator-based listeners are bound only after scanning.

Rule:

- do not rely on `@OnFrameworkEvent`, `@OnNet`, `@OnFiveMEvent` handlers before bootstrap scan completes

If you must run logic earlier, do it explicitly during bootstrap, not through decorators.

---

## 9. Examples of bad usage (and the correct alternative)

### 9.1 Bad: DB query inside controller

Bad:

- controller directly queries the database

Good:

- controller calls `AccountRepository` or `AccountService`

### 9.2 Bad: gameplay state in `Player`

Bad:

- `player.money += 50`

Good:

- `economy.deposit(player.accountID, 50)`

### 9.3 Bad: net event used as internal event bus

Bad:

- server emits net events to itself to coordinate services

Good:

- use `emitFrameworkEvent` + `@OnFrameworkEvent` for server-local decoupling
