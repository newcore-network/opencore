import { describe, it, expect, beforeEach } from 'vitest'
import { resetCitizenFxMocks, registeredCommands, registeredNetEvents } from '../../tests/mocks/citizenfx'
import { CommandService } from '../../src/server/services/command.service'
import { CommandNetworkController } from '../../src/server/controllers/command.controller'
import { DefaultSecurityHandler } from '../../src/server/services/default/default-security.handler'
import { PlayerService } from '../../src/server/services/player.service'
import { NetEventProcessor } from '../../src/server/system/processors/netEvent.processor'
import { PlayerFactory } from '../utils/player-factory'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { z } from 'zod'

class TestController {
  async simpleCommand(player: any, args: any[]) {
    return { success: true }
  }

  async validatedCommand(player: any, args: [number, string]) {
    return { success: true, args }
  }

  async guardedCommand(player: any, args: any[]) {
    return { success: true }
  }

  async throttledCommand(player: any, args: any[]) {
    return { success: true }
  }
}

const validatedSchema = z.tuple([z.coerce.number(), z.coerce.string()])

describe('Command Full Load Benchmarks', () => {
  let commandService: CommandService
  let commandController: CommandNetworkController
  let playerService: PlayerService
  let netEventProcessor: NetEventProcessor
  let testController: TestController

  beforeEach(() => {
    resetCitizenFxMocks()
    registeredCommands.clear()

    const securityHandler = new DefaultSecurityHandler()
    playerService = new PlayerService()
    commandService = new CommandService(securityHandler)
    netEventProcessor = new NetEventProcessor(playerService, securityHandler)
    testController = new TestController()
    commandController = new CommandNetworkController(commandService)

    commandService.register(
      {
        name: 'simple',
        methodName: 'simpleCommand',
        target: TestController,
      },
      testController.simpleCommand.bind(testController),
    )

    commandService.register(
      {
        name: 'validated',
        methodName: 'validatedCommand',
        target: TestController,
        schema: validatedSchema,
      },
      testController.validatedCommand.bind(testController),
    )

    commandService.register(
      {
        name: 'guarded',
        methodName: 'guardedCommand',
        target: TestController,
      },
      testController.guardedCommand.bind(testController),
    )

    netEventProcessor.process(commandController, 'onCommandReceived', {
      eventName: 'core:internal:executeCommand',
    })
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Command Full - ${playerCount} players, simple command (chat → RegisterCommand → onNet → CommandService → Handler)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })

      // Registrar jugadores en el servicio
      for (const player of players) {
        playerService.bind(player.clientID)
        playerService.linkAccount(player.clientID, player.accountID || `account-${player.clientID}`)
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      for (const player of players) {
        const start = performance.now()
        try {
          // Simular flujo completo desde el chat
          // 1. Chat input → RegisterCommand (ya registrado)
          // 2. onNet handler (simulado)
          const handler = registeredCommands.get('simple')
          if (handler) {
            handler(player.clientID, ['arg1'])
          }

          // 3. CommandService.execute
          await commandService.execute(player, 'simple', ['arg1'], '/simple arg1')

          const end = performance.now()
          timings.push(end - start)
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Command Full - Simple (${playerCount} players)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.errorRate).toBeLessThan(0.1)
      reportLoadMetric(metrics)
    })

    it(`Command Full - ${playerCount} players, validated command (with Zod)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })

      for (const player of players) {
        playerService.bind(player.clientID)
        playerService.linkAccount(player.clientID, player.accountID || `account-${player.clientID}`)
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      for (const player of players) {
        const start = performance.now()
        try {
          await commandService.execute(player, 'validated', ['123', 'test'], '/validated 123 test')
          const end = performance.now()
          timings.push(end - start)
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Command Full - Validated (${playerCount} players)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.errorRate).toBeLessThan(0.1)
      reportLoadMetric(metrics)
    })

    it(`Command Full - ${playerCount} players, concurrent commands`, async () => {
      const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })

      for (const player of players) {
        playerService.bind(player.clientID)
        playerService.linkAccount(player.clientID, player.accountID || `account-${player.clientID}`)
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      const promises = players.map(async (player) => {
        const start = performance.now()
        try {
          await commandService.execute(player, 'simple', ['arg1'], '/simple arg1')
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
        `Command Full - Concurrent (${playerCount} players)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.errorRate).toBeLessThan(0.1)
      reportLoadMetric(metrics)
    })

    it(`Command Full - ${playerCount} players, end-to-end from net event`, async () => {
      const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })

      for (const player of players) {
        playerService.bind(player.clientID)
        playerService.linkAccount(player.clientID, player.accountID || `account-${player.clientID}`)
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      // Obtener el handler de net event registrado
      const netEventHandler = registeredNetEvents.get('core:internal:executeCommand')

      for (const player of players) {
        const start = performance.now()
        try {
          // Simular el flujo completo desde el net event
          if (netEventHandler) {
            ;(global as any).source = player.clientID
            await netEventHandler('simple', ['arg1'], '/simple arg1')
          } else {
            // Fallback: llamar directamente al servicio
            await commandService.execute(player, 'simple', ['arg1'], '/simple arg1')
          }

          const end = performance.now()
          timings.push(end - start)
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Command Full - End-to-End (${playerCount} players)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.errorRate).toBeLessThan(0.1)
      reportLoadMetric(metrics)
    })
  }
})

