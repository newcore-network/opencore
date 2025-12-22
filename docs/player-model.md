# Player Model (FiveM)

This document defines the conceptual contract of the `Player` abstraction in OpenCore.

It is intentionally strict. A clear Player model is one of the main reasons OpenCore avoids the typical “everything is global state” drift.

---

## 1. What `Player` represents

On the server, `Player` (`src/runtime/server/entities/player.ts`) represents:

- a **connected client** (FiveM `source` / server id)
- the **current session** for that connection
- a small set of **safe operations** targeting that client

It exists to stop passing raw `source` integers everywhere and to provide a stable interface for:

- emitting client events
- disconnecting a player
- teleporting (server-side or via client spawn system)
- storing session-scoped meta

---

## 2. What `Player` must NOT contain

`Player` must not be your gameplay model.

Avoid putting domain state into `Player` such as:

- money / inventory / job / faction / XP
- permanent progression
- business rules (“how a bank transfer works”)

Those belong in your **gameplay modules**, typically as:

- services (`EconomyService`, `InventoryService`)
- domain models (`Account`, `Character`, `JobRole`)
- repositories (`AccountRepository`)

Reason:

- gameplay evolves quickly
- the framework must stay stable
- mixing them creates hidden coupling and makes persistence rules ambiguous

---

## 3. Relationship to session

`Player` wraps a `PlayerSession` owned by `PlayerService` (`src/runtime/server/services/core/player.service.ts`).

The session contains:

- `clientID` (source)
- `accountID` (linked persistent id, once authenticated)
- `identifiers` (license/steam/discord…)
- `meta` (arbitrary transient session metadata)

Important properties:

- **Session meta is transient by default.**
  - It exists only for the lifetime of the session.
  - It does not imply persistence unless your persistence provider saves it.

---

## 4. Player lifecycle (server)

A `Player` instance exists only after the session is created.

In the default lifecycle (`src/runtime/server/controllers/session.controller.ts`):

- on `playerJoining`:
  - `PlayerService.bind(clientId, identifiers)` creates and registers a session
  - `PlayerPersistenceService.handleSessionLoad(player)` is called
  - internal events are emitted:
    - `core:playerSessionCreated`
    - later (async): `core:playerFullyConnected`

- on `playerDropped`:
  - persistence save may run
  - `PlayerService.unbindByClient(clientId)` removes the session
  - internal event emitted: `core:playerSessionDestroyed`

If a net event arrives before the session exists, the framework ignores it (no `Player`, no handler call).

---

## 5. Server `Player` vs gameplay entities

A useful rule:

- `Player` is an **interface to a connection + session**.
- Gameplay entities are **your domain objects**.

Examples:

- `Player` (framework):
  - `player.emit('something', payload)`
  - `player.kick('reason')`
  - `player.setMeta('lastCommand', ...)`

- `Character` (gameplay):
  - name, appearance, skills, inventory, money
  - persistence rules
  - business invariants

Your services should typically translate:

- `Player` → domain identity (e.g., `accountID`) → load domain state

---

## 6. Why this abstraction exists

OpenCore has an opinionated separation:

- **framework**: infrastructure and safe runtime primitives
- **gameplay**: business logic and state

`Player` exists to keep the server runtime predictable:

- handlers receive a stable object (`Server.Player`) instead of relying on global `source`
- security and validation pipelines can assume the first argument is the player context
- services can consistently retrieve identity (`player.clientID`, `player.accountID`)

---

## 7. Client-side player

The client exports a separate player helper (`src/runtime/client/player/player.ts`).

This client-side player is:

- a convenience wrapper around GTA/FiveM natives (`PlayerPedId`, `GetEntityCoords`, etc.)
- not the same concept as server `Player`

Rule:

- Do not confuse the client player helper with the server session/player model.
- Client player state is not authoritative.
