import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetCitizenFxMocks,
  registeredCommands,
  registeredNetEvents,
} from '../../tests/mocks/citizenfx'
import { CommandService } from '../../src/runtime/server/services/command.service'
import { CommandNetworkController } from '../../src/runtime/server/controllers/command.controller'
import { DefaultSecurityHandler } from '../../src/runtime/server/services/default/default-security.handler'
import { PlayerService } from '../../src/runtime/server/services/core/player.service'
import { NetEventProcessor } from '../../src/runtime/server/system/processors/netEvent.processor'
import { PlayerFactory } from '../utils/player-factory'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { z } from 'zod'
import type { CommandMetadata } from '../../src/runtime/server/decorators/command'
import { Player } from '../../src/runtime/server/entities/player'
import { NodePlayerInfo } from '../../src/adapters/node/node-playerinfo'
import { DefaultNetEventSecurityObserver } from '../../src/runtime/server/services/default/default-net-event-security-observer'
import { FiveMNetTransport } from '../../src/adapters/fivem/fivem-net-transport'

class TestController {
  async simpleCommand(player: any, arg1: string) {
    return { success: true }
  }

  async validatedCommand(player: any, amount: number, name: string) {
    return { success: true, amount, name }
  }

  async guardedCommand(player: any, arg1: string) {
    return { success: true }
  }

  async throttledCommand(player: any, arg1: string) {
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
    const playerInfo = new NodePlayerInfo()
    playerService = new PlayerService(playerInfo)
    commandService = new CommandService()
    const observer = new DefaultNetEventSecurityObserver()
    const netTransport = new FiveMNetTransport()
    netEventProcessor = new NetEventProcessor(
      playerService,
      securityHandler,
      observer,
      netTransport,
    )
    testController = new TestController()
    commandController = new CommandNetworkController(commandService)

    const metaSimple: CommandMetadata = {
      command: 'simple',
      methodName: 'simpleCommand',
      target: TestController,
      paramTypes: [Player, String],
      paramNames: ['player', 'arg1'],
      expectsPlayer: true,
      description: undefined,
      usage: '/simple <arg1>',
      schema: undefined,
    }
    commandService.register(metaSimple, testController.simpleCommand.bind(testController))

    const metaValidated: CommandMetadata = {
      command: 'validated',
      methodName: 'validatedCommand',
      target: TestController,
      paramTypes: [Player, Number, String],
      paramNames: ['player', 'amount', 'name'],
      expectsPlayer: true,
      description: undefined,
      usage: '/validated <amount> <name>',
      schema: validatedSchema,
    }
    commandService.register(metaValidated, testController.validatedCommand.bind(testController))

    const metaGuarded: CommandMetadata = {
      command: 'guarded',
      methodName: 'guardedCommand',
      target: TestController,
      paramTypes: [Player, String],
      paramNames: ['player', 'arg1'],
      expectsPlayer: true,
      description: undefined,
      usage: '/guarded <arg1>',
      schema: undefined,
    }
    commandService.register(metaGuarded, testController.guardedCommand.bind(testController))

    netEventProcessor.process(commandController, 'onCommandReceived', {
      eventName: 'core:execute-command',
      paramTypes: [Player, String, Array],
    })
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Command Full - ${playerCount} players, simple command (chat → RegisterCommand → onNet → CommandService → Handler)`, async () => {
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
          const handler = registeredCommands.get('simple')
          if (handler) {
            handler(player.clientID, ['arg1'])
          }

          await commandService.execute(player, 'simple', ['arg1'])

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
          await commandService.execute(player, 'validated', ['123', 'test'])
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
          await commandService.execute(player, 'simple', ['arg1'])
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

      const netEventHandler = registeredNetEvents.get('core:execute-command')

      for (const player of players) {
        const start = performance.now()
        try {
          if (netEventHandler) {
            ;(global as any).source = player.clientID
            await netEventHandler('simple', ['arg1'])
          } else {
            await commandService.execute(player, 'simple', ['arg1'])
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
