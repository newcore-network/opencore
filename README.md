[![CI](https://github.com/newcore-network/opencore/actions/workflows/ci.yml/badge.svg)](https://github.com/newcore-network/opencore/actions/workflows/ci.yml)
![npm](https://img.shields.io/npm/v/@open-core/framework?style=flat-square)
![license](https://img.shields.io/github/license/newcore-network/opencore?style=flat-square)
![typescript](https://img.shields.io/badge/TypeScript-first-blue?style=flat-square)
[![cli](https://img.shields.io/badge/CLI-opencore--cli-purple?style=flat-square)](https://opencorejs.dev/docs/cli/introduction)
[![website](https://img.shields.io/badge/web-opencorejs.dev-black?style=flat-square)](https://opencorejs.dev)


# OpenCore Framework - Open Stable beta

OpenCore is a TypeScript multiplayer runtime framework targeting CitizenFX runtimes (Cfx) via adapters.

It is not a gamemode or RP framework. It provides:

- A stable execution model (server and client)
- Dependency Injection and metadata-driven wiring
- An event/command system
- Security primitives (validation, access control, rate limiting)

License: MPL-2.0

[Discord Community](https://discord.gg/99g3FgvkPs) | [Docs](https://opencorejs.dev) | [OpenCore CLI](https://github.com/newcore-network/opencore-cli)

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

Most projects will import the `Server`/`Client` namespaces:

```ts
import { Server } from '@open-core/framework/server'
```

## Architecture

OpenCore follows a Ports & Adapters (Hexagonal) architecture.

- Kernel (`src/kernel`): engine-agnostic infrastructure (DI, logger, metadata scanning)
- Runtime (`src/runtime`): multiplayer execution model (controllers, processors, security, lifecycle)
- Adapters (`src/adapters`): platform integration (Cfx, Node testing)

The runtime never auto-detects the platform. Adapters are selected explicitly at bootstrap time.

### Cfx game profiles

OpenCore treats CitizenFX (`cfx`) as the platform and supports game profiles (`gta5` and `rdr3`).

- Shared runtime APIs (events, exports, transport, DI) are registered through the Cfx adapter.
- Game-specific behavior is controlled through platform capabilities/config (`gameProfile`, `defaultSpawnModel`, etc.).
- Optional RedM-specific enhancements can be layered as external libraries without changing core runtime contracts.

## Operating modes

Each instance runs in exactly one mode configured via `Server.init()`:

- `CORE`: authoritative runtime. Typically provides identity/auth/players via exports.
- `RESOURCE`: a normal Cfx resource using CORE as provider for some features.
- `STANDALONE`: a self-contained runtime (useful for tooling, simulations, or small servers).

## Server bootstrap

Initialize the server runtime:

```ts
import { Server } from '@open-core/framework/server'

await Server.init({
  mode: 'CORE'
})
```

Some features require providers (depending on your mode and configuration). Configure them before calling `init()`:

```ts
import { Server } from '@open-core/framework/server'

Server.setPrincipalProvider(MyPrincipalProvider)
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

### Library events

Use library wrappers to emit domain events and `@OnLibraryEvent()` to observe them.

`@OnLibraryEvent()` listens to events emitted through `library.emit(...)` only.
It does not listen to `emitExternal`, `emitNetExternal`, or `emitServer`.

```ts
import { Server } from '@open-core/framework/server'

const characters = Server.createServerLibrary('characters')

@Server.Controller()
export class CharacterListeners {
  @Server.OnLibraryEvent('characters', 'session:created')
  onSessionCreated(payload: { sessionId: string; playerId: number }) {
    // optional listener for library domain events
  }
}

characters.emit('session:created', { sessionId: 's-1', playerId: 10 })
```

Client usage follows the same pattern with `Client.createClientLibrary(...)` and
`@Client.OnLibraryEvent(...)`.

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
