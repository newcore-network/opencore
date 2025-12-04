# OpenCore Framework

> **The robust TypeScript Engine for FiveM.**
> Built on strong OOP principles, Layered Architecture, and Security-first design.
> _Stop writing scripts; start engineering gameplay._

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Version](https://img.shields.io/badge/beta-0.5.0-orange.svg)](https://github.com/newcore-network/opencore)
![coverage](https://img.shields.io/badge/coverage-43%25-yellow)
![core decorators](https://img.shields.io/badge/core%20decorators-100%25-brightgreen)

## 🚀 Why OpenCore?

OpenCore transforms FiveM development from chaotic scripting into professional software engineering. Inspired by enterprise frameworks like **Spring Boot** and **NestJS**, it brings structure, security, and strict typing to your server.

### ✨ Key Features

- **🛡️ Security by Design:** Built-in Input Validation (**Zod**), Rate Limiting (`@Throttle`), and Access Control (`@Guard`).
- **Decoupled Architecture:** Logic is separated into **Controllers**, **Services**, and **Entities**.
- **Dependency Injection:** Full IoC container powered by `tsyringe`.
- **Type-Safe:** No more guessing `source` types or argument structures.
- **Event-Driven:** Powerful Event Bus for internal and network communication.

---

## 📦 Installation

```bash
pnpm add @opencore/framework reflect-metadata tsyringe zod uuid
```

**(Ensure you have experimentalDecorators and emitDecoratorMetadata enabled in your tsconfig.json)**

## ⚡ Quick Start

Define a Controller, validate inputs with Zod, and protect it with a Guard. Zero boilerplate.

Server-side:

```ts
import { Server } from '@opencore/framework/server'
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

## 🛡️ Security System

OpenCore handles the dirty work so you can focus on gameplay.

1. Input Validation (@Command, @OnNet)
   All network inputs are validated against Zod schemas before they reach your logic. Malformed packets are rejected automatically.

2. Access Control (@Guard)
   Protect methods with granular permissions or hierarchical ranks.

```ts
@Server.Guard({ permission: 'admin.ban' })
@Server.Guard({ rank: 10 }) // Admin level
```

3. State Management (@RequiresState)
   Avoid "dead player exploits" or interaction glitches.

```ts
@Server.RequiresState({ missing: ['dead', 'cuffed'] })
openInventory(player: Server.Player) { ... }
```

## 🏗️ Architecture

- Controllers: Handle entry points (Commands, Events, NUI). They should remain thin.
- Services: Contain the business logic. They are singletons and can be injected anywhere.
- Entities: Wrappers around FiveM objects (like Player) to provide a rich API.

## 📄 License

OpenCore is licensed under the MPL-2.0.
