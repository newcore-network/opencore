[![CI](https://github.com/newcore-network/opencore/actions/workflows/ci.yml/badge.svg)](https://github.com/newcore-network/opencore/actions/workflows/ci.yml)
![npm](https://img.shields.io/npm/v/@open-core/framework?style=flat-square)
![license](https://img.shields.io/github/license/newcore-network/opencore?style=flat-square)
![typescript](https://img.shields.io/badge/TypeScript-first-blue?style=flat-square)
[![cli](https://img.shields.io/badge/CLI-opencore--cli-purple?style=flat-square)](https://opencorejs.dev/docs/cli/introduction)
[![website](https://img.shields.io/badge/web-opencorejs.dev-black?style=flat-square)](https://opencorejs.dev)


# OpenCore Framework - Open Stable beta

OpenCore is a TypeScript multiplayer runtime framework targeting FiveM via an adapter.

It is not a gamemode or RP framework. It provides:

- A stable execution model (server and client)
- Dependency Injection and metadata-driven wiring
- An event/command system
- Security primitives (validation, access control, rate limiting)

License: MPL-2.0

[Discord Community](https://discord.gg/99g3FgvkPs) | [Website](https://opencorejs.dev) | [OpenCore CLI](https://github.com/newcore-network/opencore-cli)

## Scope

This package (`@open-core/framework`) contains transversal infrastructure only.

- Controllers, services, decorators, and processors
- Session/lifecycle primitives and contracts
- Adapters and capability registration

Gameplay logic must live in separate resources/modules.

## Installation

```bash
pnpm add @open-core/framework reflect-metadata tsyringe zod uuid
```

This framework uses TypeScript decorators. Ensure your project has decorators enabled.

## Imports and entry points

The package exposes subpath entry points:

- `@open-core/framework` (root)
- `@open-core/framework/server`
- `@open-core/framework/client`
- `@open-core/framework/shared`
- `@open-core/framework/utils`

Most projects will import the `Server`/`Client` namespaces:

```ts
import { Server } from '@open-core/framework'
```

## Architecture

OpenCore follows a Ports & Adapters (Hexagonal) architecture.

- Kernel (`src/kernel`): engine-agnostic infrastructure (DI, logger, metadata scanning)
- Runtime (`src/runtime`): multiplayer execution model (controllers, processors, security, lifecycle)
- Adapters (`src/adapters`): platform integration (FiveM, Node testing)

The runtime never auto-detects the platform. Adapters are selected explicitly at bootstrap time.

## Operating modes

Each instance runs in exactly one mode configured via `Server.init()`:

- `CORE`: authoritative runtime. Typically provides identity/auth/players via exports.
- `RESOURCE`: a normal FiveM resource using CORE as provider for some features.
- `STANDALONE`: a self-contained runtime (useful for tooling, simulations, or small servers).

## Server bootstrap

Initialize the server runtime:

```ts
import { Server } from '@open-core/framework/server'

await Server.init({
  mode: 'STANDALONE',
  features: {
    commands: { enabled: true },
    netEvents: { enabled: true },
  },
})
```

Some features require providers (depending on your mode and configuration). Configure them before calling `init()`:

```ts
import { Server } from '@open-core/framework/server'

Server.setPrincipalProvider(MyPrincipalProvider)
Server.setAuthProvider(MyAuthProvider)
Server.setSecurityHandler(MySecurityHandler)
Server.setPersistenceProvider(MyPlayerPersistence)
Server.setNetEventSecurityObserver(MyNetEventSecurityObserver)
```

## Controllers and decorators

OpenCore uses a decorator + processor pattern.

Decorators store metadata with `Reflect.defineMetadata()`. During bootstrap, the `MetadataScanner` reads metadata and processors register handlers.

### Commands

```ts
import { Server } from '@open-core/framework/server'
import { z } from 'zod'

const TransferSchema = z.tuple([z.coerce.number().int().positive(), z.coerce.number().min(1)])

@Server.Controller()
export class BankController {
  @Server.Command({
    command: 'transfer',
    usage: '/transfer <id> <amount>',
    schema: TransferSchema,
  })
  @Server.Guard({ rank: 1 })
  @Server.Throttle(1, 2000)
  async transfer(player: Server.Player, args: z.infer<typeof TransferSchema>) {
    const [targetId, amount] = args
    player.emit('chat:message', `transfer -> ${targetId} (${amount})`)
  }
}
```

### Network events

`@OnNet()` handlers always receive `Player` as the first parameter.

```ts
import { Server } from '@open-core/framework/server'
import { z } from 'zod'

const PayloadSchema = z.object({ action: z.string(), amount: z.number().int().positive() })

@Server.Controller()
export class ExampleNetController {
  @Server.OnNet('bank:action', { schema: PayloadSchema })
  async onBankAction(player: Server.Player, payload: z.infer<typeof PayloadSchema>) {
    player.emit('chat:message', `action=${payload.action} amount=${payload.amount}`)
  }
}
```

### Security decorators

- `@Guard({ rank })` or `@Guard({ permission })`
- `@Throttle(limit, windowMs)`
- `@RequiresState({ missing: [...] })`

## Testing

Tests run with Vitest.

```bash
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:coverage
```

Note: `pnpm test` does not run benchmarks.

## Benchmarks

There are two benchmark suites:

- Core benchmarks (Tinybench)
- Load benchmarks (Vitest project `benchmark`)

```bash
pnpm bench:core
pnpm bench:load
pnpm bench:all
```

### Snapshot (latest local run)

These values are a small extract from a recent local run (Dec 22, 2025). Results vary by machine.

- **Core**
  - Decorators - Define metadata (Command): `~5.72M ops/sec` (mean `0.17μs`)
  - EventBus - Multiple event types: `~2.01M ops/sec` (mean `0.50μs`)
  - Dependency Injection (simple resolve): `~1.7M ops/sec`
- **Load**
  - Net Events - Simple (10 players): `~28.85K ops/sec` (p95 `0.25ms`)
  - Net Events - Concurrent (500 players): `~1.18M ops/sec` (p95 `0.40ms`)
  - Commands (validated, ~500 players): `~14M ops/sec`

Full reports and methodology are available in benchmark/README.md.

### Reports

Benchmark reports are generated under `benchmark/reports/`.

- `pnpm bench:all` generates aggregated reports (text/json/html)
- Load metrics used by load benchmarks are persisted in `benchmark/reports/.load-metrics.json`

For details about the benchmark system, see `benchmark/README.md`.

## Development scripts

```bash
pnpm build
pnpm watch
pnpm lint
pnpm lint:fix
pnpm format
```

## Ecosystem

OpenCore is designed to be extended via separate packages/resources.

- `@open-core/identity`: identity and permission system

## License

MPL-2.0. See `LICENSE`.
