# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenCore is a **TypeScript-based multiplayer runtime framework** targeting FiveM as its primary platform via a dedicated adapter. It is not a gamemode, script pack, or RP framework—it provides a stable, event-driven runtime and architectural foundation for building gameplay systems.

**Core Vision**: OpenCore is a long-lived runtime engine, not a FiveM-only solution. FiveM is the default first-class adapter, not a hard dependency. The architecture supports multiple platforms via adapters and must remain testable in pure Node.js.

## Build & Development Commands

```bash
pnpm build              # Compile TypeScript
pnpm watch              # Watch mode
pnpm lint               # Run ESLint
pnpm lint:fix           # Fix ESLint issues
pnpm format             # Format with Prettier
```

## Testing Commands

```bash
pnpm test               # Run all tests
pnpm test:unit          # Run unit tests only
pnpm test:integration   # Run integration tests only
pnpm test:coverage      # Generate coverage report
pnpm test:watch         # Watch mode
```

Run a single test file:

```bash
npx vitest run tests/unit/server/decorators/command.test.ts
```

## Benchmark Commands

```bash
pnpm bench:core         # Core component benchmarks (Tinybench)
pnpm bench:load         # Load benchmarks with player simulation
pnpm bench:all          # Full benchmark suite with reports
```

## Architectural Layers

OpenCore follows a **Ports & Adapters (Hexagonal) Architecture**
applied to a multiplayer runtime.

### 1. Kernel — Engine-Agnostic Infrastructure

Located in `src/kernel/`.

Contains:

- Dependency Injection container
- Structural decorators and metadata definitions
- Metadata scanning utilities
- Core contracts and value objects
- Logging and configuration primitives

The Kernel defines **system rules**, not execution.
It must never depend on runtime state, execution side, or engine APIs.

**The Kernel must never depend on FiveM globals or APIs.**

### 2. Runtime — Multiplayer Execution Model

Located in `src/runtime/`.

Contains:

- Session and lifecycle management
- Controllers and processors
- Runtime-level decorators (event bindings, lifecycle hooks)
- Security enforcement and validation
- Execution context (server/client)

The Runtime decides **what runs**, but not **how it runs**.
It is engine-agnostic and depends only on declared platform capabilities.

### 3. Adapters — Platform Integration

Located in `src/adapters/` or external repositories.

Adapters implement platform-specific capabilities such as:

- Networking
- Engine lifecycle events
- Exports
- Resource metadata

The runtime never auto-detects the platform.
The adapter is selected explicitly at bootstrap time.

Example adapters:

- FiveM adapter (external package)
- Node adapter (internal, for tests and simulation)

Adapters contain no gameplay logic and no business rules.

## Operating Modes

Every OpenCore instance runs in exactly one explicit mode (configured via `Server.init()`):

| Mode           | Purpose                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **CORE**       | Authoritative runtime. Source of truth for identity, permissions, sessions. Exposes stable APIs via exports.                       |
| **RESOURCE**   | Standard FiveM resource using OpenCore. Non-authoritative. Implements gameplay systems. Communicates with CORE via events/exports. |
| **STANDALONE** | Fully self-contained instance for testing, tooling, simulations, or small servers. May run in FiveM or Node.js.                    |

Feature availability and provider sources vary by mode—see `src/server/runtime.ts` for validation rules.

## Decorator-Processor Pattern

The core pattern connecting decorators to runtime behavior:

1. **Decorators** (`src/*/decorators/`) store metadata via `Reflect.defineMetadata()`
2. **Processors** (`src/*/system/processors/`) implement `DecoratorProcessor` interface to read metadata and register handlers
3. **MetadataScanner** (`src/system/metadata.scanner.ts`) orchestrates scanning controllers and invoking processors
4. **Bootstrap** initializes DI container and triggers scanning

Adding a new decorator:

1. Create decorator in `decorators/` that defines metadata
2. Create processor in `system/processors/` implementing `DecoratorProcessor`
3. Register processor in `system/processors.register.ts`

## Framework Scope

The `@open-core/framework` package contains only **transversal infrastructure**:

- Dependency Injection
- Decorators (`Controller`, `Service`, `OnNet`, `Command`, `Guard`, etc.)
- Event and command systems
- Configuration and logging
- Lifecycle management
- Security contracts and guards
- Infrastructure abstractions

**The framework does not contain gameplay logic.** All capabilities are explicitly declared and activated—nothing is assumed implicitly.

## Security Decorators

- `@Guard({ rank: N })` or `@Guard({ permission: 'x' })` — Access control
- `@Throttle(count, windowMs)` — Rate limiting
- `@RequiresState({ missing: ['dead'] })` — State prerequisites
- Zod schemas on `@Command`/`@OnNet` — Input validation

## Testing Setup

Tests use Vitest with FiveM API mocks in `tests/mocks/citizenfx.ts`. The setup file (`tests/setup.ts`) installs mocks globally and resets DI container between tests.

## Rules for Development

When proposing or implementing changes:

- **Never introduce gameplay or RP logic** into the framework
- **Never break the CORE / RESOURCE / STANDALONE separation**
- **Never couple Core or Runtime directly to FiveM APIs**—only the adapter layer
- Prefer explicit contracts over implicit behavior
- Design features as **capabilities**, not assumptions
- Prioritize security, clarity, and DX over convenience hacks
- Assume the framework is long-lived, versioned, and used in production

## Ecosystem

- Gameplay systems live in **separate FiveM resources** or user modules
- Optional domain-specific logic lives in **NPM libraries** (e.g., `@open-core/identity`)
- The CLI (`@open-core/cli`) is a separate Go repository for scaffolding and tooling

Repository: https://github.com/newcore-network/opencore
