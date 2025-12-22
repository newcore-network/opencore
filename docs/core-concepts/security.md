# Security System

OpenCore enforces security declaratively through **Decorators**. This ensures that security rules are visible, explicit, and located right next to the code they protect.

## 1. Access Control (`@Guard`)

The `@Guard` decorator restricts access to a method based on the player's **Rank** or **Permissions**. It integrates with the `AccessControlService`.

### Usage

```typescript
import { Server } from '@open-core/framework/server';

@Server.Controller()
export class AdminController {

    // Option A: Require a minimum numeric Rank
    @Server.Command('ban')
    @Server.Guard({ rank: 5 }) // Only Rank 5 (Admin) or higher
    public banPlayer(player: Server.Player) {
        // ...
    }

    // Option B: Require a specific string Permission
    @Server.Command('announce')
    @Server.Guard({ permission: 'server.announce' })
    public announce(player: Server.Player) {
        // ...
    }
}
```

**How it works:**
1.  The framework intercepts the call.
2.  It resolves `AccessControlService`.
3.  It checks if `player` meets the requirements.
4.  If not authorized, the method is **never executed**, and an error is logged (or handled).

## 2. Rate Limiting (`@Throttle`)

Prevent abuse and spam by limiting how often a player can call a specific method.

### Usage

```typescript
// Allow 1 request every 2000ms (2 seconds)
@Server.Throttle(1, 2000)
public async performAction(player: Server.Player) {
    // ...
}

// Allow 10 requests every 60 seconds (1 minute)
@Server.Throttle(10, 60000)
public async spammyAction(player: Server.Player) {
    // ...
}
```

**Scope:**
Rate limits are tracked **per player, per method**. A player spamming one command will not be blocked from using another.

## 3. Input Validation (`Zod Schemas`)

OpenCore integrates `zod` to validate network inputs **before** they reach your logic. This prevents malformed packets from crashing your server or exploiting type vulnerabilities.

### Validating Net Events (`@OnNet`)

```typescript
import { z } from 'zod';

const TransferSchema = z.tuple([
    z.string(), // Target ID
    z.number().positive() // Amount
]);

@Server.OnNet('bank:transfer', { schema: TransferSchema })
public onTransfer(player: Server.Player, targetId: string, amount: number) {
    // At this point, TS knows 'targetId' is string and 'amount' is number > 0.
    // Invalid inputs are automatically rejected.
}
```

### Validating Commands (`@Command`)

```typescript
@Server.Command({
    command: 'giveitem',
    schema: z.tuple([
        z.string(), // Item Name
        z.coerce.number().min(1) // Amount (auto-converted from string)
    ])
})
public onGiveItem(player: Server.Player, item: string, amount: number) {
    // ...
}
```

> **Note:** For commands, `z.coerce` is useful because chat arguments are strings by default.

## 4. State Requirements (`@RequiresState`)

Prevent logical exploits (e.g., using items while dead) by enforcing player state.

```typescript
@Server.RequiresState({
    missing: ['dead', 'cuffed'], // Player must NOT be dead or cuffed
    has: ['license_drive']       // Player MUST have driving license
})
public driveCar(player: Server.Player) {
    // Safe to drive
}
```
