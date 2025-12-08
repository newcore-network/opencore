import { describe, it, expect, beforeEach } from 'vitest'
import { resetCitizenFxMocks, registeredCommands } from '../../tests/mocks/citizenfx'
import { CommandService } from '../../src/server/services/command.service'
import { DefaultSecurityHandler } from '../../src/server/services/default/default-security.handler'
import { PlayerFactory } from '../utils/player-factory'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { z } from 'zod'

class TestController {
  private callCount = 0

  async handleCommand(player: any, args: any[]) {
    this.callCount++
    return { success: true, args }
  }

  async handleValidatedCommand(player: any, args: [number, number]) {
    this.callCount++
    return { success: true, args }
  }

  getCallCount() {
    return this.callCount
  }
}

const simpleSchema = z.tuple([z.coerce.number(), z.coerce.string()])

describe('Commands Load Benchmarks', () => {
  let commandService: CommandService
  let controller: TestController

  beforeEach(() => {
    resetCitizenFxMocks()
    registeredCommands.clear()

    const securityHandler = new DefaultSecurityHandler()
    commandService = new CommandService(securityHandler)
    controller = new TestController()

    commandService.register(
      {
        command: 'test',
        methodName: 'handleCommand',
        target: TestController,
      },
      controller.handleCommand.bind(controller),
    )

    commandService.register(
      {
        command: 'testvalidated',
        methodName: 'handleValidatedCommand',
        target: TestController,
        schema: simpleSchema,
      },
      controller.handleValidatedCommand.bind(controller),
    )
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
          await commandService.execute(player, 'test', ['arg1', 'arg2'], '/test arg1 arg2')
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
          await commandService.execute(
            player,
            'testvalidated',
            ['123', 'test'],
            '/testvalidated 123 test',
          )
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
          await commandService.execute(player, 'test', ['arg1'], '/test arg1')
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
