import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { CommandService } from '../../src/runtime/server/services/command.service'
import { PlayerService } from '../../src/runtime/server/services/core/player.service'
import { HttpService } from '../../src/runtime/server/services/http/http.service'
import { PlayerFactory } from '../utils/player-factory'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { z } from 'zod'
import { NodePlayerInfo } from '../../src/adapters/node/node-playerinfo'
import type { CommandMetadata } from '../../src/runtime/server/decorators/command'
import { Player } from '../../src/runtime/server/entities/player'

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: 'test' }),
  } as Response),
) as any

class TestController {
  async handleCommand(player: any, arg1: string) {
    return { success: true }
  }
}

const testSchema = z.tuple([z.coerce.number(), z.coerce.string()])

describe('Services Load Benchmarks', () => {
  let commandService: CommandService
  let playerService: PlayerService
  let httpService: HttpService

  beforeEach(() => {
    resetCitizenFxMocks()

    const playerInfo = new NodePlayerInfo()
    playerService = new PlayerService(playerInfo)
    commandService = new CommandService()
    httpService = new HttpService()
  })

  const scenarios = getAllScenarios()

  describe('CommandService', () => {
    beforeEach(() => {
      const controller = new TestController()

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
        methodName: 'handleCommand',
        target: TestController,
        paramTypes: [Player, Number, String],
        paramNames: ['player', 'amount', 'name'],
        expectsPlayer: true,
        description: undefined,
        usage: '/testvalidated <amount> <name>',
        schema: testSchema,
      }
      commandService.register(metaValidated, controller.handleCommand.bind(controller))
    })

    for (const playerCount of scenarios) {
      it(`CommandService - ${playerCount} players, register() operation`, async () => {
        const timings: number[] = []
        const iterations = 100

        for (let i = 0; i < iterations; i++) {
          const controller = new TestController()
          const start = performance.now()
          const meta: CommandMetadata = {
            command: `test-${i}`,
            methodName: 'handleCommand',
            target: TestController,
            paramTypes: [Player, String],
            paramNames: ['player', 'arg1'],
            expectsPlayer: true,
            description: undefined,
            usage: `/test-${i} <arg1>`,
            schema: undefined,
          }
          commandService.register(meta, controller.handleCommand.bind(controller))
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `CommandService - register() (${iterations} commands)`,
          playerCount,
          iterations,
          0,
        )

        reportLoadMetric(metrics)
      })

      it(`CommandService - ${playerCount} players, execute() operation`, async () => {
        const players = PlayerFactory.createPlayers(playerCount)
        const timings: number[] = []

        for (const player of players) {
          const start = performance.now()
          await commandService.execute(player, 'test', ['arg1'])
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `CommandService - execute() (${playerCount} players)`,
          playerCount,
          playerCount,
          0,
        )

        expect(metrics.successCount).toBe(playerCount)
        reportLoadMetric(metrics)
      })

      it(`CommandService - ${playerCount} players, execute() with validation`, async () => {
        const players = PlayerFactory.createPlayers(playerCount)
        const timings: number[] = []

        for (const player of players) {
          const start = performance.now()
          await commandService.execute(player, 'testvalidated', ['123', 'test'])
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `CommandService - execute() with validation (${playerCount} players)`,
          playerCount,
          playerCount,
          0,
        )

        expect(metrics.successCount).toBe(playerCount)
        reportLoadMetric(metrics)
      })

      it(`CommandService - ${playerCount} players, getAllCommands() operation`, async () => {
        const timings: number[] = []
        const iterations = 1000

        for (let i = 0; i < iterations; i++) {
          const start = performance.now()
          commandService.getAllCommands()
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `CommandService - getAllCommands() (${iterations} calls)`,
          playerCount,
          iterations,
          0,
        )

        reportLoadMetric(metrics)
      })
    }
  })

  describe('PlayerService', () => {
    for (const playerCount of scenarios) {
      it(`PlayerService - ${playerCount} players, bind() operation`, async () => {
        const timings: number[] = []

        for (let i = 0; i < playerCount; i++) {
          const start = performance.now()
          playerService.bind(i + 1, {
            license: `license:test-${i + 1}`,
          })
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `PlayerService - bind() (${playerCount} players)`,
          playerCount,
          playerCount,
          0,
        )

        expect(metrics.successCount).toBe(playerCount)
        reportLoadMetric(metrics)

        // Limpiar
        for (let i = 0; i < playerCount; i++) {
          playerService.unbindByClient(i + 1)
        }
      })

      it(`PlayerService - ${playerCount} players, getAll() operation`, async () => {
        for (let i = 0; i < playerCount; i++) {
          playerService.bind(i + 1, {
            license: `license:test-${i + 1}`,
          })
        }

        const timings: number[] = []
        const iterations = 100

        for (let i = 0; i < iterations; i++) {
          const start = performance.now()
          const players = playerService.getAll()
          const end = performance.now()
          timings.push(end - start)

          expect(players.length).toBe(playerCount)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `PlayerService - getAll() (${playerCount} players, ${iterations} calls)`,
          playerCount,
          iterations,
          0,
        )

        reportLoadMetric(metrics)

        for (let i = 0; i < playerCount; i++) {
          playerService.unbindByClient(i + 1)
        }
      })
    }
  })

  describe('HttpService', () => {
    for (const playerCount of scenarios) {
      it(`HttpService - ${playerCount} players, get() operation`, async () => {
        const timings: number[] = []

        for (let i = 0; i < playerCount; i++) {
          const start = performance.now()
          await httpService.get('https://api.example.com/test')
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `HttpService - get() (${playerCount} players)`,
          playerCount,
          playerCount,
          0,
        )

        expect(metrics.successCount).toBe(playerCount)
        reportLoadMetric(metrics)
      })

      it(`HttpService - ${playerCount} players, post() operation`, async () => {
        const timings: number[] = []

        for (let i = 0; i < playerCount; i++) {
          const start = performance.now()
          await httpService.post('https://api.example.com/test', { data: `test-${i}` })
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `HttpService - post() (${playerCount} players)`,
          playerCount,
          playerCount,
          0,
        )

        expect(metrics.successCount).toBe(playerCount)
        reportLoadMetric(metrics)
      })

      it(`HttpService - ${playerCount} players, concurrent requests`, async () => {
        const timings: number[] = []

        const promises = Array.from({ length: playerCount }, async () => {
          const start = performance.now()
          await httpService.get('https://api.example.com/test')
          const end = performance.now()
          timings.push(end - start)
        })

        await Promise.all(promises)

        const metrics = calculateLoadMetrics(
          timings,
          `HttpService - Concurrent get() (${playerCount} players)`,
          playerCount,
          playerCount,
          0,
        )

        expect(metrics.successCount).toBe(playerCount)
        reportLoadMetric(metrics)
      })
    }
  })
})
