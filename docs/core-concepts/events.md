# Events & Messaging

OpenCore provides a unified event system that handles both **Network Events** (Client <-> Server) and **Internal Events** (Service <-> Service).

## 1. Network Events (`@OnNet`)

To listen for events coming from the client (FiveM `emitNet`), use the `@OnNet` decorator in a Controller.

### Basic Usage

```typescript
import { Server } from '@open-core/framework/server'

@Server.Controller()
export class ChatController {
  @Server.OnNet('chat:say')
  public onChat(player: Server.Player, message: string) {
    console.log(`${player.name} says: ${message}`)
  }
}
```

### With Validation

Always validate untrusted network data using Zod schemas.

```typescript
import { z } from 'zod';

@Server.OnNet('shop:buy', {
    schema: z.tuple([z.string(), z.number()])
})
public onBuy(player: Server.Player, itemId: string, quantity: number) {
    // Types are inferred and runtime-checked
}
```

> **Important:** The first argument of an `@OnNet` handler is always `player: Server.Player`.

## 2. Sending Data to Client

The `Player` entity provides methods to communicate back to the client.

```typescript
// Send a message via the built-in messaging/chat system
player.send('Hello World', 'success');

// Emit a custom network event
player.emit('inventory:update', { items: [...] });
```

## 3. Internal Events

For communication between services without coupling them directly, use the internal framework event system.

> Note: This is different from FiveM's event system. These events do not go over the network.

### Publishing an Event

Import `emitFrameworkEvent` to publish internal framework events.

```typescript
import { emitFrameworkEvent } from '@open-core/framework/server'

// Emit a framework event when a player fully connects
emitFrameworkEvent('core:playerFullyConnected', { clientId: 1, license: 'abc123' })
```

### Subscribing to an Event (`@OnFrameworkEvent`)

Use the `@OnFrameworkEvent` decorator to listen for internal events within a Controller.

```typescript
@Server.Controller()
export class WelcomeController {
  @Server.OnFrameworkEvent('core:playerFullyConnected')
  public onPlayerConnected(payload: { clientId: number; license: string }) {
    console.log(`Player ${payload.clientId} has fully connected`)
    // Send welcome message or initialize player data
  }
}
```

## 4. Ticks (`@OnTick`)

To run code every frame (or at a specific interval), use `@OnTick`.

```typescript
@Server.Controller()
export class GameLoopController {
  @Server.OnTick()
  public async everyFrame() {
    // Runs every server tick
  }
}
```
