# Commands and Validation

Commands are a separate concept from network events. They are a structured way to expose actions through chat-like input (`/something ...`).

This document explains how commands are defined, how arguments are validated, and what error behavior you should expect.

---

## 1. How commands are defined

Commands are declared on server controller methods using `@Server.Command(...)`.

Example:

```ts
import { Server } from '@open-core/framework/server'

@Server.Controller()
export class ExampleController {
  @Server.Command({ command: 'ping', usage: '/ping' })
  ping(player: Server.Player) {
    player.send('pong', 'chat')
  }
}
```

At bootstrap time:

- the framework scans controller metadata
- `CommandProcessor` registers the command handler into `CommandService`

---

## 2. How commands are executed

Commands are executed through the built-in network command gateway:

- `CommandNetworkController` listens to `core:execute-command` (`src/runtime/server/controllers/command.controller.ts`)

Behavior:

- leading `/` is removed
- suspicious commands are rejected:
  - more than 10 args
  - command names that do not match `^[a-zA-Z0-9:_-]+$`

Then `CommandService.execute(player, command, args)` runs.

---

## 3. Argument rules

### 3.1 First argument is always `Player`

If your command handler has parameters, the first parameter must be `Server.Player`.

Valid:

```ts
@Server.Command('give')
give(player: Server.Player, itemId: string) {}
```

Invalid:

```ts
@Server.Command('give')
give(itemId: string) {}
```

The decorator enforces this rule using runtime parameter types.

### 3.2 Commands receive raw strings

Chat arguments arrive as strings.

Validation is responsible for coercion.

---

## 4. Validation

Commands support two validation modes:

### 4.1 Tuple schema (positional args)

Use `z.tuple([...])` for positional validation.

```ts
import { z } from 'zod'

@Server.Command({
  command: 'setrank',
  usage: '/setrank <rank>',
  schema: z.tuple([z.coerce.number().int().min(0)]),
})
setRank(player: Server.Player, rank: number) {}
```

### 4.2 Object schema (named args by parameter name)

If you use `z.object({...})`, the framework maps args to parameter names.

Example: `deposit(player, amount)` will map `args[0]` to `{ amount: args[0] }`.

This mode is strict:

- missing schema keys cause a schema mismatch error
- extra schema keys cause a schema mismatch error

---

## 5. Schema auto-generation

If you do not provide `schema`, the framework attempts to generate a schema from parameter runtime types.

Important limitation:

- only primitive-like types can be auto-validated (`string|number|boolean|any[]`)
- for complex payloads, always provide an explicit Zod schema

If auto-generation fails and the command expects args, `CommandService.execute` throws:

- `AppError('SCHEMA:MISMATCH', ...)`

---

## 6. Error behavior

There are two relevant layers:

### 6.1 Execution errors in `CommandService`

`CommandService.execute(...)` throws `AppError` for:

- `COMMAND:NOT_FOUND`
- `GAME:BAD_REQUEST` (incorrect usage)
- `SCHEMA:MISMATCH` (schema/handler mismatch)

### 6.2 Network gateway behavior

`CommandNetworkController` catches `AppError`.

- for `GAME:BAD_REQUEST` and `COMMAND:NOT_FOUND`, it sends the error message to the player
- for other errors, it sends a generic message

---

## 7. Conventions

Recommended conventions for stable ergonomics:

- command names: `kebab-case` or `snake_case` but keep them consistent
- always include `usage` for any command that takes arguments
- prefer `z.coerce.*` because args arrive as strings
- keep command handlers small; delegate real logic to services

---

## 8. Anti-patterns

- Using commands as a general RPC mechanism for structured data.
  - Prefer net events with Zod schemas for that.
- Doing heavy logic directly in the controller method.
  - Prefer calling a service.
- Parsing JSON manually without validation.
  - Use Zod preprocessing + validation.
