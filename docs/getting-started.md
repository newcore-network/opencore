# Getting Started

This guide covers the installation and initial setup of an OpenCore project.

**Prerequisites:**

- Node.js v18+ (LTS recommended)
- PNPM (Recommended) or NPM/Yarn
- TypeScript knowledge

## 1. Installation

OpenCore is distributed as an NPM package. You can add it to an existing resource or start a new project.

```bash
pnpm add @open-core/framework reflect-metadata tsyringe zod uuid
```

**Required Peer Dependencies:**

- `reflect-metadata`: For decorator support.
- `tsyringe`: For Dependency Injection.
- `zod`: For input validation schemas.

## 2. TypeScript Configuration

OpenCore relies heavily on decorators. You **must** enable specific compiler options in your `tsconfig.json`.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "experimentalDecorators": true, // REQUIRED
    "emitDecoratorMetadata": true, // REQUIRED
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## 3. The Entry Point

Create a server-side entry file (e.g., `server/index.ts`). You must initialize the `Server` application before defining controllers.

```typescript
import 'reflect-metadata' // Must be the first import
import { Server } from '@open-core/framework/server'

// 1. Initialize the Application
await Server.init({
  mode: 'CORE', // 'CORE' | 'RESOURCE' | 'STANDALONE'
})

console.log('OpenCore Server started successfully')
```

## 4. Creating Your First Controller

Controllers are the entry points for your logic. They handle commands, network events, and ticks.

```typescript
// src/controllers/hello.controller.ts
import { Server } from '@open-core/framework/server'
import { z } from 'zod'

@Server.Controller()
export class HelloController {
  @Server.Command({
    command: 'hello',
    schema: z.tuple([z.string().optional()]), // Validate args
    usage: '/hello [name]',
  })
  public onHelloCommand(player: Server.Player, args: [string | undefined]) {
    const name = args[0] || player.name
    console.log(`Hello command received from ${player.name}`)

    player.send('Welcome to newcore', 'chat')
  }
}
```

## 5. Building & Running

Since OpenCore uses TypeScript, you need to compile your code before running it in FiveM.

1.  **Build:** `tsc -p tsconfig.json`
2.  **fxmanifest.lua:** Ensure your manifest points to the compiled JS files.

```lua
-- fxmanifest.lua
fx_version 'cerulean'
game 'gta5'

server_script 'dist/server/index.js'
client_script 'dist/client/index.js'
```

## Next Steps

Now that you have the basic loop running, explore the core concepts:

- [Create Services](./core-concepts/services.md) to handle business logic.
- [Secure your routes](./core-concepts/security.md) with Guards and Throttlers.
- [Handle Events](./core-concepts/events.md) using the Event Bus.
