import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { CommandMetadata } from '../../src/runtime/server/decorators/command'
import { Player } from '../../src/runtime/server/entities/player'
import { LocalCommandImplementation } from '../../src/runtime/server/implementations/local/command.local'
import { registeredCommands, resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { PlayerFactory } from '../utils/player-factory'

class TestController {
  private callCount = 0

  async handleCommand(player: any, arg1: string) {
    this.callCount++
    return { success: true, arg1 }
  }

  async handleValidatedCommand(player: any, amount: number, name: string) {
    this.callCount++
    return { success: true, amount, name }
  }

  getCallCount() {
    return this.callCount
  }
}

const simpleSchema = z.tuple([z.coerce.number(), z.coerce.string()])

describe('Commands Load Benchmarks', () => {
  let commandService: LocalCommandImplementation
  let controller: TestController

  beforeEach(() => {
    resetCitizenFxMocks()
    registeredCommands.clear()

    commandService = new LocalCommandImplementation()
    controller = new TestController()

    const metaSimple: CommandMetadata = {
      command: 'test',
      methodName: 'handleCommand',
      target: TestController,
      paramTypes: [Player, String],
      paramNames: ['player', 'arg1'],
      expectsPlayer: true,
      description: undefined,
      usage: '/test <arg1>',
      schema: undefined,
    }

    commandService.register(metaSimple, controller.handleCommand.bind(controller))

    const metaValidated: CommandMetadata = {
      command: 'testvalidated',
      methodName: 'handleValidatedCommand',
      target: TestController,
      paramTypes: [Player, Number, String],
      paramNames: ['player', 'amount', 'name'],
      expectsPlayer: true,
      description: undefined,
      usage: '/testvalidated <amount> <name>',
      schema: simpleSchema,
    }

    commandService.register(metaValidated, controller.handleValidatedCommand.bind(controller))
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Commands - ${playerCount} players, simple command`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      for (const player of players) {
        const start = performance.now()
        try {
          await commandService.execute(player, 'test', ['arg1'])
          const end = performance.now()
          timings.push(end - start)
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Commands - ${playerCount} players (simple)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.successCount).toBe(playerCount)
      expect(metrics.errorCount).toBe(0)
      expect(metrics.throughput).toBeGreaterThan(0)

      reportLoadMetric(metrics)
    })

    it(`Commands - ${playerCount} players, validated command`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      for (const player of players) {
        const start = performance.now()
        try {
          await commandService.execute(player, 'testvalidated', ['123', 'test'])
          const end = performance.now()
          timings.push(end - start)
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Commands - ${playerCount} players (validated)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.successCount).toBe(playerCount)
      expect(metrics.errorCount).toBe(0)

      reportLoadMetric(metrics)
    })

    it(`Commands - ${playerCount} players, concurrent execution`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      const promises = players.map(async (player) => {
        const start = performance.now()
        try {
          await commandService.execute(player, 'test', ['arg1'])
          const end = performance.now()
          timings.push(end - start)
          successCount++
        } catch (error) {
          errorCount++
        }
      })

      await Promise.all(promises)

      const metrics = calculateLoadMetrics(
        timings,
        `Commands - ${playerCount} players (concurrent)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.successCount).toBe(playerCount)
      expect(metrics.errorCount).toBe(0)

      reportLoadMetric(metrics)
    })
  }
})
