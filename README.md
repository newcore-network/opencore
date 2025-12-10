# OpenCore Framework - Unstable ALPHA ❗

> **The robust TypeScript Engine for FiveM.**
> Built on strong OOP principles, Layered Architecture, and Security-first design.
> _Stop writing scripts; start engineering gameplay._

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Version](https://img.shields.io/badge/beta-1.0.3-orange.svg)](https://github.com/newcore-network/opencore)
![Tests](https://img.shields.io/badge/tests-265%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-43%25-yellow)
![Core Decorators](https://img.shields.io/badge/core%20decorators-100%25-brightgreen)

## 📋 Table of Contents

- [Why OpenCore?](#-why-opencore)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Security System](#️-security-system)
- [Architecture](#️-architecture)
- [Testing](#-testing)
- [Performance](#-performance--benchmarks)
- [Project Structure](#-project-structure)
- [Scripts](#-available-scripts)
- [License](#-license)

---

## 🚀 Why OpenCore?

OpenCore transforms FiveM development from chaotic scripting into professional software engineering. Inspired by enterprise frameworks like **Spring Boot** and **NestJS**, it brings structure, security, and strict typing to your server.

### ✨ Key Features

- **🛡️ Security by Design:** Built-in Input Validation (**Zod**), Rate Limiting (`@Throttle`), and Access Control (`@Guard`).
- **🏗️ Decoupled Architecture:** Logic is separated into **Controllers**, **Services**, and **Entities**.
- **💉 Dependency Injection:** Full IoC container powered by `tsyringe`.
- **📝 Type-Safe:** No more guessing `source` types or argument structures.
- **📡 Event-Driven:** Powerful Event Bus for internal and network communication.
- **⚡ High Performance:** Sub-microsecond latencies, millions of ops/sec.
- **🧪 Fully Tested:** Comprehensive unit, integration, and load tests.

---

## 📦 Installation

```bash
pnpm add @open-core/framework reflect-metadata tsyringe zod uuid
```

> **Note:** Ensure you have `experimentalDecorators` and `emitDecoratorMetadata` enabled in your `tsconfig.json`.

---

## ⚡ Quick Start

Define a Controller, validate inputs with Zod, and protect it with a Guard. Zero boilerplate.

**Server-side:**

```ts
import { Server } from '@open-core/framework/server'
import { z } from 'zod'

// 1. Define your Input Schema
const TransferSchema = z.tuple([
  z.coerce.number().positive(), // Target ID
  z.coerce.number().min(1).max(50000), // Amount
])

@Server.Controller()
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Server.Command({
    name: 'transfer',
    schema: TransferSchema,
    usage: '/transfer [id] [amount]',
  })
  @Server.Guard({ rank: 1 }) // Must be at least Rank 1 (User)
  @Server.Throttle(1, 2000) // Max 1 request per 2 seconds
  async handleTransfer(player: Server.Player, args: z.infer<typeof TransferSchema>) {
    const [targetId, amount] = args

    // Logic is pure and type-safe
    await this.bankService.transfer(player, targetId, amount)

    player.emit('chat:message', `Successfully transferred $${amount}`)
  }
}
```

---

## 🛡️ Security System

OpenCore handles the dirty work so you can focus on gameplay.

### 1. Input Validation (`@Command`, `@OnNet`)

All network inputs are validated against Zod schemas before they reach your logic. Malformed packets are rejected automatically.

### 2. Access Control (`@Guard`)

Protect methods with granular permissions or hierarchical ranks:

```ts
@Server.Guard({ permission: 'admin.ban' })
@Server.Guard({ rank: 10 }) // Admin level
```

### 3. Rate Limiting (`@Throttle`)

Prevent abuse with configurable rate limits:

```ts
@Server.Throttle(5, 10000) // 5 requests per 10 seconds
```

### 4. State Management (`@RequiresState`)

Avoid "dead player exploits" or interaction glitches:

```ts
@Server.RequiresState({ missing: ['dead', 'cuffed'] })
openInventory(player: Server.Player) { ... }
```

---

## 🏗️ Architecture

OpenCore follows a clean, layered architecture:

| Layer           | Responsibility                                               | Example          |
| --------------- | ------------------------------------------------------------ | ---------------- |
| **Controllers** | Handle entry points (Commands, Events, NUI). Keep them thin. | `BankController` |
| **Services**    | Contain business logic. Singletons injectable anywhere.      | `BankService`    |
| **Entities**    | Wrappers around FiveM objects with rich APIs.                | `Player`         |

```
┌─────────────────────────────────────────────────────────┐
│                     Client / FiveM                       │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    Controllers                           │
│  @Command  @OnNet  @NUI  @GameEvent  @OnTick            │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│              Security Layer (Middleware)                 │
│  @Guard  @Throttle  @RequiresState  Zod Validation      │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                     Services                             │
│  Business Logic  •  PlayerService  •  BankService       │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                  Core Event Bus                          │
│  Internal Events  •  Cross-Service Communication        │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

OpenCore has a comprehensive testing suite using **Vitest**.

### Test Categories

| Category        | Description                             | Command                 |
| --------------- | --------------------------------------- | ----------------------- |
| **Unit**        | Individual components and decorators    | `pnpm test:unit`        |
| **Integration** | Component interactions and bootstrap    | `pnpm test:integration` |
| **Load**        | Performance under simulated player load | `pnpm bench:load`       |
| **All Tests**   | Run everything                          | `pnpm test`             |

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration

# Watch mode for development
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── server/
│   │   └── decorators/
│   │       ├── command.test.ts
│   │       ├── guard.test.ts
│   │       ├── throttle.test.ts
│   │       └── ...
│   └── utils/
├── integration/       # Integration tests
│   ├── client/
│   └── server/
├── mocks/             # FiveM mocks
│   └── citizenfx.ts
└── helpers/           # Test utilities
```

### Coverage

All core decorators are **100% tested**:

- `@Command`, `@Guard`, `@Throttle`, `@OnNet`, `@OnTick`
- `@Controller`, `@Public`, `@Export`, `@CoreEvent`, `@Bind`

---

## ⚡ Performance & Benchmarks

OpenCore is built for performance. Our benchmark suite validates that the framework can handle production workloads with ease.

### Run Benchmarks

```bash
# Core component benchmarks (Tinybench)
pnpm bench:core

# Load benchmarks with player simulation (Vitest)
pnpm bench:load

# Full benchmark suite with reports
pnpm bench:all
```

### Latest Results (v0.6.0-beta.1)

#### Core Components

| Component         | Operation          | Throughput    | Latency |
| ----------------- | ------------------ | ------------- | ------- |
| **DI Container**  | Resolve service    | 1.65M ops/sec | 0.61μs  |
| **Zod**           | Simple validation  | 1.99M ops/sec | 0.50μs  |
| **Zod**           | Complex validation | 1.00M ops/sec | 1.00μs  |
| **RateLimiter**   | Key check          | 2.56M ops/sec | 0.39μs  |
| **AccessControl** | Permission check   | 2.76M ops/sec | 0.36μs  |
| **EventBus**      | Emit event         | 3.22M ops/sec | 0.31μs  |
| **Decorators**    | Define metadata    | 5.48M ops/sec | 0.18μs  |

#### Load Tests (500 Concurrent Players)

| Scenario                    | Throughput      | p95 Latency | Error Rate |
| --------------------------- | --------------- | ----------- | ---------- |
| **Net Events (Simple)**     | 92.59M ops/sec  | 0.80μs      | 0.00%      |
| **Net Events (Validated)**  | 11.47M ops/sec  | 2.70μs      | 0.00%      |
| **Net Events (Concurrent)** | 1.61M ops/sec   | 294.22μs    | 0.00%      |
| **Serialization (Large)**   | 146.53K ops/sec | 951.11μs    | 0.00%      |

#### Key Performance Highlights

- ✅ **Zero error rate** across all load scenarios (10 → 500 players)
- ✅ **Sub-microsecond latency** for core operations
- ✅ **Excellent scalability** - handles 500+ concurrent players
- ✅ **Consistent p95/p99** - predictable latency behavior

> Full benchmark details available in [`benchmark/README.md`](./benchmark/README.md)

---

## 📁 Project Structure

```
opencore/
├── src/
│   ├── client/           # Client-side framework
│   │   ├── decorators/   # @OnNet, @Key, @Tick, @NUI, etc.
│   │   ├── services/     # Streaming, UI, World services
│   │   └── system/       # Processors and metadata
│   ├── server/           # Server-side framework
│   │   ├── decorators/   # @Command, @Guard, @Throttle, etc.
│   │   ├── services/     # Player, Command, RateLimiter, etc.
│   │   ├── entities/     # Player entity
│   │   └── bus/          # Core Event Bus
│   ├── shared/           # Shared utilities
│   │   └── logger/       # Logging system
│   └── system/           # Core system (MetadataScanner, DI)
├── tests/                # Test suites
│   ├── unit/
│   ├── integration/
│   └── mocks/
├── benchmark/            # Performance benchmarks
│   ├── core/             # Tinybench benchmarks
│   ├── load/             # Vitest load tests
│   └── reports/          # Generated reports
└── dist/                 # Compiled output
```

---

## 📜 Available Scripts

| Script                  | Description                      |
| ----------------------- | -------------------------------- |
| `pnpm build`            | Compile TypeScript to JavaScript |
| `pnpm watch`            | Watch mode for development       |
| `pnpm lint`             | Run ESLint                       |
| `pnpm lint:fix`         | Fix ESLint issues                |
| `pnpm format`           | Format code with Prettier        |
| `pnpm test`             | Run all tests                    |
| `pnpm test:unit`        | Run unit tests only              |
| `pnpm test:integration` | Run integration tests only       |
| `pnpm test:coverage`    | Generate coverage report         |
| `pnpm bench`            | Show benchmark options           |
| `pnpm bench:core`       | Run core benchmarks              |
| `pnpm bench:load`       | Run load benchmarks              |
| `pnpm bench:all`        | Run all benchmarks with reports  |

---

## Available Modules

A module is a library belonging to the OpenCore family, where you can take advantage of its functionality if you wish, and where we provide the foundation for building a specific system.

- [Open-core Identity](https://github.com/newcore-network/opencore-identity): Flexible identity and permission system for OpenCore. Provides multiple authentication strategies, role management, and permission-based authorization through the framework's Principal system. [NPM](https://www.npmjs.com/package/@open-core/identity).

```bash
pnpm add @open-core/identity
```

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. All tests pass (`pnpm test`)
2. Code is formatted (`pnpm format`)
3. No linting errors (`pnpm lint`)
4. New features include tests

---

## 📄 License

OpenCore is licensed under the **MPL-2.0**.

See [LICENSE](./LICENSE) for details.

---

<p align="center">
  <strong>OpenCore Framework</strong><br>
  <em>Stop scripting. Start engineering.</em>
</p>
