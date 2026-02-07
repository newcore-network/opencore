import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { NodeEvents } from '../../src/adapters/node/transport/node.events'
import { NodePlayerInfo } from '../../src/adapters/node/node-playerinfo'
import { NodeEntityServer } from '../../src/adapters/node/node-entity-server'
import { NodePlayerServer } from '../../src/adapters/node/node-player-server'
import type { CommandMetadata } from '../../src/runtime/server/decorators/command'
import { Player } from '../../src/runtime/server/entities/player'
import { LocalCommandImplementation } from '../../src/runtime/server/implementations/local/command.local'
import { LocalPlayerImplementation } from '../../src/runtime/server/implementations/local/player.local'
import { DefaultNetEventSecurityObserver } from '../../src/runtime/server/default/default-net-event-security-observer'
import { DefaultSecurityHandler } from '../../src/runtime/server/default/default-security.handler'
import { NetEventProcessor } from '../../src/runtime/server/system/processors/netEvent.processor'
import { WorldContext } from '../../src/runtime/core/world'
import {
  registeredCommands,
  resetCitizenFxMocks,
} from '../../tests/mocks/citizenfx'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { PlayerFactory } from '../utils/player-factory'
import { TickSimulator } from '../utils/tick-simulator'

;(global as any).setTick = (handler: () => void | Promise<void>) => {}

class StressTestController {
  private commandCount = 0
  private eventCount = 0

  async handleCommand(player: any, amount: number, name: string) {
    this.commandCount++
    return { success: true, count: this.commandCount }
  }

  async handleEvent(player: any, data: any) {
    this.eventCount++
    return { success: true, count: this.eventCount }
  }

  getCounts() {
    return { commands: this.commandCount, events: this.eventCount }
  }
}

const commandSchema = z.tuple([z.coerce.number(), z.coerce.string()])
const eventSchema = z.object({
  action: z.string(),
  amount: z.number(),
})

describe('Stress Test Load Benchmarks', () => {
  let commandService: LocalCommandImplementation
  let playerService: LocalPlayerImplementation
  let netEventProcessor: NetEventProcessor
  let testController: StressTestController
  let tickSimulator: TickSimulator
  let nodeEvents: NodeEvents

  beforeEach(() => {
    resetCitizenFxMocks()
    registeredCommands.clear()

    const securityHandler = new DefaultSecurityHandler()
    nodeEvents = new NodeEvents()
    playerService = new LocalPlayerImplementation(
      new WorldContext(),
      new NodePlayerInfo(),
      new NodePlayerServer(),
      new NodeEntityServer(),
      nodeEvents,
    )
    commandService = new LocalCommandImplementation()
    const observer = new DefaultNetEventSecurityObserver()
    netEventProcessor = new NetEventProcessor(
      playerService,
      securityHandler,
      observer,
      nodeEvents,
    )
    testController = new StressTestController()
    tickSimulator = new TickSimulator()

    const metaStress: CommandMetadata = {
      command: 'stress',
      methodName: 'handleCommand',
      target: StressTestController,
      paramTypes: [Player, Number, String],
      paramNames: ['player', 'amount', 'name'],
      expectsPlayer: true,
      description: undefined,
      usage: '/stress <amount> <name>',
      schema: commandSchema,
    }
    commandService.register(metaStress, testController.handleCommand.bind(testController))

    netEventProcessor.process(testController, 'handleEvent', {
      eventName: 'stress:event',
      schema: eventSchema,
      paramTypes: [Object],
    })

    for (let i = 0; i < 10; i++) {
      tickSimulator.register(`stress-tick-${i}`, () => {
        const sum = 1 + 1
      })
    }
  })

  it('Stress Test - 500 players, mixed workload (commands + events + ticks)', async () => {
    const playerCount = 500
    const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })

    for (const player of players) {
      playerService.bind(player.clientID, {
        license: `license:test-${player.clientID}`,
      })
      const p = playerService.getByClient(player.clientID)
      if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
    }

    const commandTimings: number[] = []
    const eventTimings: number[] = []
    const tickTimings: number[] = []
    const totalTimings: number[] = []

    const commandsPerPlayer = 5
    const eventsPerPlayer = 5
    const ticksToExecute = 100

    const startTotal = performance.now()

    const commandPromises = players.flatMap((player) =>
      Array.from({ length: commandsPerPlayer }, async () => {
        const start = performance.now()
        try {
          await commandService.execute(player, 'stress', ['123', 'test'])
          const end = performance.now()
          commandTimings.push(end - start)
        } catch (error) {}
      }),
    )

    const eventPromises = players.flatMap((player) => {
      return Array.from({ length: eventsPerPlayer }, async () => {
        const start = performance.now()
        try {
          nodeEvents.simulateClientEvent('stress:event', player.clientID, {
            action: 'test',
            amount: 100,
          })
          const end = performance.now()
          eventTimings.push(end - start)
        } catch (error) {}
      })
    })

    const tickPromises = Array.from({ length: ticksToExecute }, async () => {
      const start = performance.now()
      await tickSimulator.executeTick()
      const end = performance.now()
      tickTimings.push(end - start)
    })

    await Promise.all([...commandPromises, ...eventPromises, ...tickPromises])

    const endTotal = performance.now()
    const totalTime = endTotal - startTotal
    totalTimings.push(totalTime)

    const commandMetrics = calculateLoadMetrics(
      commandTimings,
      'Stress Test - Commands',
      playerCount,
      commandTimings.length,
      0,
    )

    const eventMetrics = calculateLoadMetrics(
      eventTimings,
      'Stress Test - Events',
      playerCount,
      eventTimings.length,
      0,
    )

    const tickMetrics = calculateLoadMetrics(
      tickTimings,
      'Stress Test - Ticks',
      10,
      tickTimings.length,
      0,
    )

    const totalOperations = commandTimings.length + eventTimings.length + tickTimings.length
    const totalThroughput = (totalOperations / totalTime) * 1000

    reportLoadMetric(commandMetrics)
    reportLoadMetric(eventMetrics)
    reportLoadMetric(tickMetrics)

    console.log(`[STRESS] Total time: ${totalTime.toFixed(2)}ms`)
    console.log(`[STRESS] Total operations: ${totalOperations}`)
    console.log(`[STRESS] Total throughput: ${totalThroughput.toFixed(2)} ops/sec`)

    for (const player of players) {
      playerService.unbind(player.clientID)
    }
  })

  it('Stress Test - 500 players, sequential vs concurrent execution', async () => {
    const playerCount = 500
    const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })

    for (const player of players) {
      playerService.bind(player.clientID, {
        license: `license:test-${player.clientID}`,
      })
      const p = playerService.getByClient(player.clientID)
      if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
    }

    const sequentialTimings: number[] = []
    const sequentialStart = performance.now()

    for (const player of players) {
      const start = performance.now()
      await commandService.execute(player, 'stress', ['123', 'test'])
      const end = performance.now()
      sequentialTimings.push(end - start)
    }

    const sequentialEnd = performance.now()
    const sequentialTotal = sequentialEnd - sequentialStart

    const concurrentTimings: number[] = []
    const concurrentStart = performance.now()

    const promises = players.map(async (player) => {
      const start = performance.now()
      await commandService.execute(player, 'stress', ['123', 'test'])
      const end = performance.now()
      concurrentTimings.push(end - start)
    })

    await Promise.all(promises)

    const concurrentEnd = performance.now()
    const concurrentTotal = concurrentEnd - concurrentStart

    const sequentialMetrics = calculateLoadMetrics(
      sequentialTimings,
      'Stress Test - Sequential',
      playerCount,
      playerCount,
      0,
    )

    const concurrentMetrics = calculateLoadMetrics(
      concurrentTimings,
      'Stress Test - Concurrent',
      playerCount,
      playerCount,
      0,
    )

    const speedup = sequentialTotal / concurrentTotal

    reportLoadMetric(sequentialMetrics)
    reportLoadMetric(concurrentMetrics)

    console.log(`[STRESS] Speedup: ${speedup.toFixed(2)}x`)

    for (const player of players) {
      playerService.unbind(player.clientID)
    }
  })

  it('Stress Test - 500 players, degradation under load', async () => {
    const playerCount = 500
    const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })

    for (const player of players) {
      playerService.bind(player.clientID, {
        license: `license:test-${player.clientID}`,
      })
      const p = playerService.getByClient(player.clientID)
      if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
    }

    const batchSizes = [50, 100, 200, 300, 400, 500]
    const results: Array<{ batchSize: number; throughput: number; p95: number }> = []

    for (const batchSize of batchSizes) {
      const timings: number[] = []
      const batch = players.slice(0, batchSize)

      const start = performance.now()

      const promises = batch.map(async (player) => {
        const start = performance.now()
        await commandService.execute(player, 'stress', ['123', 'test'])
        const end = performance.now()
        timings.push(end - start)
      })

      await Promise.all(promises)

      const end = performance.now()
      const totalTime = end - start

      const metrics = calculateLoadMetrics(
        timings,
        `Stress Test - Batch ${batchSize}`,
        batchSize,
        batchSize,
        0,
      )

      reportLoadMetric(metrics)

      results.push({
        batchSize,
        throughput: metrics.throughput,
        p95: metrics.p95,
      })
    }

    const baseline = results[0]
    for (let i = 1; i < results.length; i++) {
      const result = results[i]
      const degradation = ((baseline.throughput - result.throughput) / baseline.throughput) * 100
      console.log(`[STRESS] Degradation at ${result.batchSize} players: ${degradation.toFixed(2)}%`)

      expect(degradation).toBeLessThan(90)
    }

    for (const player of players) {
      playerService.unbind(player.clientID)
    }
  })

  it('Stress Test - 500 players, all components simultaneously', async () => {
    const playerCount = 500
    const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })

    for (const player of players) {
      playerService.bind(player.clientID, {
        license: `license:test-${player.clientID}`,
      })
      const p = playerService.getByClient(player.clientID)
      if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
    }

    const timings: number[] = []
    const start = performance.now()

    const allPromises = [
      ...players.slice(0, 100).map(async (player) => {
        await commandService.execute(player, 'stress', ['123', 'test'])
      }),

      ...players.slice(100, 200).map(async (player) => {
        nodeEvents.simulateClientEvent('stress:event', player.clientID, { action: 'test', amount: 100 })
      }),

      ...Array.from({ length: 50 }, async () => {
        await tickSimulator.executeTick()
      }),

      ...players.slice(200, 300).map(async (player) => {
        playerService.setMeta(player.clientID, 'stress-test', { value: Date.now() })
        await playerService.getMeta(player.clientID, 'stress-test')
      }),

      ...Array.from({ length: 10 }, async () => {
        playerService.getAll()
      }),
    ]

    await Promise.all(allPromises)

    const end = performance.now()
    const totalTime = end - start
    timings.push(totalTime)

    console.log(`[STRESS] All Components Simultaneously:`)
    console.log(`  └─ Total time: ${totalTime.toFixed(2)}ms`)
    console.log(`  └─ Total operations: ${allPromises.length}`)
    console.log(`  └─ Throughput: ${(allPromises.length / totalTime) * 1000} ops/sec`)

    for (const player of players) {
      playerService.unbind(player.clientID)
    }
  })
})
