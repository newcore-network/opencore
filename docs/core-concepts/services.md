# Services & Dependency Injection

OpenCore utilizes a powerful **Dependency Injection (DI)** system managed by the internal Kernel. This approach ensures your code remains modular, testable, and loosely coupled.

## The `@Service` Decorator

In OpenCore, business logic lives in **Services**. To register a class as a service, use the framework's `@Service()` decorator.

```typescript
import { Server } from '@open-core/framework/server'

@Server.Service()
export class EconomyService {
  private taxRate = 0.05

  public calculateTax(amount: number): number {
    return amount * this.taxRate
  }
}
```

### How Creation Works (Implications)

When you decorate a class with `@Service()`, two important things happen:

1.  **Registration:** The class is registered in the DI container with a specific lifecycle (default: **Singleton**).
2.  **Lazy Instantiation:** The service is **NOT** created immediately when the server starts. It is instantiated the first time it is injected into a Controller or another Service.

**⚠️ Critical Rule:** Never manually instantiate a service using `new EconomyService()`. Doing so will bypass the Dependency Injection system, meaning dependencies won't be injected, and you will break the Singleton state.

## Dependency Injection

To use a service, simply declare it in the constructor of your dependent class (Controller or another Service). The Kernel handles the rest.

### Injecting into a Controller

```typescript
import { Server } from '@open-core/framework/server'
import { EconomyService } from '../services/economy.service'

@Server.Controller()
export class BankController {
  // The Kernel detects this dependency and injects the existing Singleton instance
  constructor(private economy: EconomyService) {}

  @Server.Command({
    command: 'tax',
    usage: '/tax',
  })
  public checkTax(player: Server.Player) {
    const tax = this.economy.calculateTax(100)
    player.send(`Current tax on $100 is $${tax}`, 'chat')
  }
}
```

### Scopes

By default, services are **Singletons** (shared across the entire application). You can change this behavior using the `scope` option:

```typescript
// Singleton (Default): One instance shared everywhere. State is persistent.
@Server.Service({ scope: 'singleton' })

// Transient: A new instance is created for every resolution request.
// Use this for stateless utilities or request-specific logic.
@Server.Service({ scope: 'transient' })
```

## Built-in Services

The framework provides several ready-to-use services:

- **`AccessControlService`**: Manage player ranks and permissions.
- **`CommandService`**: Inspect registered commands dynamically.
- **`RateLimiterService`**: Manage throttling keys manually.
- **`ConfigService`**: Access `server.cfg` or environment variables.
- **`LoggerService`**: Advanced structured logging.

## Manual Resolution

While constructor injection is the standard, you can manually resolve services using the `di` container exported by the framework. This is useful for integration with legacy code or external libraries.

```typescript
import { di } from '@open-core/framework'
import { EconomyService } from './economy.service'

// Manually retrieve the singleton instance
const economy = di.resolve(EconomyService)
```
