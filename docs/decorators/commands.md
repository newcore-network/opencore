# Decorators: Commands

Commands are a dedicated interaction surface for chat-like input (`/command ...`).

OpenCore treats commands as **first-class**:

- declarative registration (`@Server.Command`)
- consistent player context
- validation pipeline
- predictable error ergonomics

This document focuses on the decorator contract.

For the full command system overview, see `docs/commands.md`.

---

## 1. `@Server.Command(configOrName)`

### What it does

Declares a controller method as a command handler.

### When to use it

Use commands for:

- player-triggered actions that naturally fit chat input
- admin/moderation commands
- debugging and tooling

Do not use commands as a general RPC mechanism.

---

## 2. Handler contract

### 2.1 First parameter rule

If your handler has parameters, the first one must be `Server.Player`.

Minimal valid handler:

```ts
@Server.Command('ping')
ping(player: Server.Player) {}
```

Handler with args:

```ts
@Server.Command({ command: 'give', usage: '/give <itemId>' })
give(player: Server.Player, itemId: string) {}
```

---

## 3. Validation contract

### 3.1 Tuple schema (positional)

Use a tuple schema when arguments are positional:

```ts
import { z } from 'zod'

@Server.Command({
  command: 'setrank',
  usage: '/setrank <rank>',
  schema: z.tuple([z.coerce.number().int().min(0)]),
})
setRank(player: Server.Player, rank: number) {}
```

### 3.2 Object schema (named)

Use an object schema when you want mapping by parameter name.

Rule:

- schema keys must match handler parameter names

---

## 4. What the decorator guarantees

- the command is discoverable through bootstrap scanning
- consistent player context (`Server.Player`)
- validation hooks are applied before your method is invoked

---

## 5. What the decorator does NOT guarantee

- that your controller module was imported
- that your command is available before bootstrap scanning
- that complex payloads will be correctly validated without an explicit schema

---

## 6. Common mistakes

- Missing `usage` for commands with arguments.
- Parsing JSON manually without validation.
- Putting business logic in the command handler instead of calling a service.
- Using commands to transport complex data (prefer net events with schemas).
