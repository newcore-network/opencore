# Decorators: Controllers and Services

This document covers the class-level decorators that define structure:

- controllers (entry points)
- services (business logic)
- repositories (persistence boundary)
- binding scopes

This document is intentionally focused on usage and mistakes, not internal implementation.

---

## 1. `@Server.Controller()` / `@Client.Controller()`

### What it does

Marks a class as a framework-managed controller.

A controller is an **entry point**:

- net events
- commands
- ticks
- internal framework events

### When to use it

Use a controller when the class contains methods decorated with:

- `@Server.OnNet`, `@Client.OnNet`
- `@Server.Command`
- `@Server.OnFrameworkEvent`
- `@Server.OnFiveMEvent`
- `@Server.OnTick`, `@Client.Tick`, `@Client.Interval`

### Minimal example

```ts
import { Server } from '@open-core/framework/server'

@Server.Controller()
export class ExampleController {
  @Server.OnNet('example:ping')
  ping(player: Server.Player, message: string) {
    player.send(`pong: ${message}`, 'chat')
  }
}
```

### Common mistakes

- **Forgetting to import the controller module**
  - If the file is never imported, the controller is never registered.
- **Doing heavy logic inside the controller**
  - keep controllers thin; delegate to services.

---

## 2. `@Server.Service()`

### What it does

Marks a class as a framework-managed service and binds it into DI.

### When to use it

Use a service for:

- business logic
- workflows
- domain coordination

### Minimal example

```ts
import { Server } from '@open-core/framework/server'

@Server.Service()
export class EconomyService {
  deposit(accountId: string, amount: number) {
    // ...
  }
}
```

### Common mistakes

- **Instantiating services with `new`**
  - this bypasses DI and breaks singleton assumptions.

---

## 3. `@Server.Repo()`

### What it does

Marks a class as a repository (persistence boundary) and binds it into DI.

### When to use it

Use a repo for:

- database access
- persistence-specific data mapping

### Minimal example

```ts
import { Server } from '@open-core/framework/server'

@Server.Repo()
export class AccountRepository {
  async findById(id: string) {
    // ...
  }
}
```

### Common mistakes

- **Putting gameplay rules into repositories**
  - repos should not contain business logic.

---

## 4. `@Server.Bind(scope)`

### What it does

Applies an explicit DI lifecycle.

### When to use it

Use `@Bind` when you need full control (otherwise prefer `@Service` / `@Repo`).

### Scopes

- `singleton`
  - one shared instance
- `transient`
  - resolution-scoped (one instance per resolution scope)

### Minimal example

```ts
import { Server } from '@open-core/framework/server'

@Server.Bind('singleton')
export class SharedCache {
  // ...
}
```

### Common mistakes

- **Assuming `transient` means “always new instance”**
  - treat it as resolution-scoped unless you explicitly design around scopes.

---

## 5. Rule of thumb

- Controllers: "how requests enter"
- Services: "how the game works"
- Repos: "how data is stored"
