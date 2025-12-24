# Architecture Overview

OpenCore differs fundamentally from other FiveM frameworks by strictly separating the **Engine** (Kernel) from the **Game Logic** (Runtime) and the **Platform** (Adapter). This separation of concerns is what enables high testability and stability. Following Hexagonal Architecture.

## High-Level Diagram

```mermaid
graph TD
    subgraph "Platform Layer"
        FiveM[FiveM / RedM]
        NodeJS[Node.js (Testing)]
    end

    subgraph "OpenCore Framework"
        Adapter[Adapter Layer]
        Kernel[Kernel (Core Infrastructure)]
        Runtime[Runtime (Execution Model)]
    end

    subgraph "User Land"
        Controllers[Controllers]
        Services[Services]
        Entities[Entities]
    end

    FiveM --> Adapter
    NodeJS --> Adapter
    Adapter --> Runtime
    Runtime --> Kernel
    Controllers --> Runtime
    Services --> Kernel
```

---

## 1. The Kernel (Core Infrastructure)

The **Kernel** (`src/kernel/`) is the heart of the framework. It is completely **platform-agnostic**, meaning it contains zero references to FiveM, natives, or global variables. It runs purely on TypeScript/JavaScript.

**Responsibilities:**

- **Dependency Injection (DI):** Manages the lifecycle of all services and controllers using `tsyringe`.
- **Metadata Scanning:** Scans classes for decorators (`@Command`, `@Service`) to build the execution graph.
- **Core Event Bus:** Handles internal communication between decoupled components.
- **Logging & Config:** Provides standardized I/O utilities.

## 2. The Runtime (Execution Model)

The **Runtime** (`src/runtime/`) defines _how_ a multiplayer server operates. It implements the "Game Loop" concepts without being tied to a specific game engine implementation.

**Responsibilities:**

- **Controller Logic:** Routes requests to specific methods.
- **Security Pipeline:** Executes Guards (`@Guard`), Rate Limiters (`@Throttle`), and Validation (`Zod`).
- **Player Lifecycle:** Manages sessions, authentication flows, and disconnects.
- **Context Management:** Ensures `source`, `Player`, and `state` are available in request scopes.

## 3. The Adapter Layer

The **Adapter** (`src/adapters/`) is the bridge. It implements the concrete behavior defined by the Kernel contracts using specific platform APIs.

**Why this matters:**

- **FiveM Adapter:** Uses `onNet`, `emitNet`, `GetPlayerName`, etc.
- **Node Adapter:** Uses internal event emitters and mock data.

This allows us to run the **exact same Codebase** in a CI/CD pipeline (Node Adapter) and in production (FiveM Adapter).

---

## 4. The Request Pipeline

When a player triggers an event (e.g., executing a command), the data flows through a strict pipeline:

1.  **Transport Layer:** The Adapter receives the raw net event from FiveM.
2.  **Routing:** The Runtime identifies which Controller Method handles this event.
3.  **Middleware (Pre-Execution):**
    - **Throttle:** Is the player spamming? -> _Block_.
    - **Guard:** Does the player have permission? -> _Block_.
    - **Validation:** Does `args` match the Zod Schema? -> _Block_.
4.  **Execution:** The Controller method is invoked with safe, typed arguments.
5.  **Response:** The result (if any) is sent back through the Adapter.

## 5. Dependency Injection Flow

OpenCore uses a **Singleton by Default** pattern for Services and **Transient** (or Scoped) pattern for some Request contexts.

```typescript
@Service() // Registered as Singleton
class DatabaseService { ... }

@Controller()
class PlayerController {
  // Dependency is injected automatically
  constructor(private db: DatabaseService) {}
}
```

This ensures that shared resources (Database connections, State managers) are instantiated once and reused efficiently.
