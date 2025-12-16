/**
 * Example: Bootstrapping OpenCore Server in Node.js (without FiveM)
 *
 * This demonstrates how to run the OpenCore runtime in a pure Node.js environment.
 * Useful for:
 * - Testing framework behavior without FiveM
 * - CI/CD integration tests
 * - Local development and debugging
 * - Framework validation
 *
 * To run:
 *   npx tsx examples/node-bootstrap.ts
 */

import 'reflect-metadata'
import { initServer } from '../src/server/bootstrap'
import { Controller } from '../src/server/decorators/controller'
import { NetEvent } from '../src/server/decorators/netEvent'
import { Export } from '../src/server/decorators/export'
import { di } from '../src/server/container'
import { INetTransport } from '../src/server/capabilities/INetTransport'
import { IExports } from '../src/server/capabilities/IExports'
import { NodeNetTransport } from '../src/server/capabilities/node/node-net-transport'
import { NodeExports } from '../src/server/capabilities/node/node-exports'

// Example Controller
@Controller()
class ExampleController {
  @NetEvent('example:greet')
  handleGreeting(clientId: number, name: string) {
    console.log(`[NetEvent] Client ${clientId} says: Hello, ${name}!`)
    return `Welcome, ${name}!`
  }

  @Export('getServerTime')
  getTime() {
    const now = new Date().toISOString()
    console.log(`[Export] getServerTime called -> ${now}`)
    return now
  }

  @Export('calculate')
  calculate(operation: string, a: number, b: number) {
    console.log(`[Export] calculate called -> ${operation}(${a}, ${b})`)
    switch (operation) {
      case 'add':
        return a + b
      case 'subtract':
        return a - b
      case 'multiply':
        return a * b
      case 'divide':
        return a / b
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  }
}

async function main() {
  console.log('=== OpenCore Node.js Bootstrap Example ===\n')

  // Set resource name via environment variable
  process.env.RESOURCE_NAME = 'example-node-resource'

  // Initialize the server
  console.log('Initializing OpenCore runtime in Node.js...')
  await initServer({
    mode: 'CORE',
    features: {
      netEvents: { enabled: true, provider: 'core', export: false, scope: 'core', required: false },
      exports: { enabled: true, provider: 'core', export: false, scope: 'core', required: false },
      commands: { enabled: false, provider: 'local', export: false, scope: 'core', required: false },
      fiveMEvents: { enabled: false, provider: 'local', export: false, scope: 'core', required: false },
      players: { enabled: false, provider: 'local', export: false, scope: 'core', required: false },
      sessionLifecycle: { enabled: false, provider: 'local', export: false, scope: 'core', required: false },
      chat: { enabled: false, provider: 'local', export: false, scope: 'core', required: false },
      principal: { enabled: false, provider: 'local', export: false, scope: 'core', required: false },
      database: { enabled: false, provider: 'local', export: false, scope: 'core', required: false },
      http: { enabled: false, provider: 'local', export: false, scope: 'core', required: false },
      auth: { enabled: false, provider: 'local', export: false, scope: 'core', required: false },
    },
  })

  console.log('✓ Runtime initialized successfully!\n')

  // Demonstrate NetEvent handling
  console.log('--- Testing NetEvent ---')
  const transport = di.resolve(INetTransport as any) as NodeNetTransport
  transport.simulateClientEvent('example:greet', 42, 'Alice')
  transport.simulateClientEvent('example:greet', 99, 'Bob')

  // Wait for event processing
  await new Promise(resolve => setTimeout(resolve, 100))

  // Demonstrate Export calls
  console.log('\n--- Testing Exports ---')
  const exportsService = di.resolve(IExports as any) as NodeExports

  const getTimeFn = exportsService.getExport('getServerTime')
  if (getTimeFn) {
    const time = getTimeFn()
    console.log(`Server time: ${time}`)
  }

  const calcFn = exportsService.getExport('calculate')
  if (calcFn) {
    console.log(`10 + 5 = ${calcFn('add', 10, 5)}`)
    console.log(`10 * 3 = ${calcFn('multiply', 10, 3)}`)
  }

  console.log('\n=== Example completed successfully! ===')
  console.log('Note: This demonstrates OpenCore running entirely in Node.js')
  console.log('without any FiveM dependencies.\n')
}

main().catch(error => {
  console.error('Fatal error during bootstrap:', error)
  process.exit(1)
})
