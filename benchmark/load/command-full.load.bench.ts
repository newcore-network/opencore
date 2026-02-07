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
  registeredNetEvents,
  resetCitizenFxMocks,
} from '../../tests/mocks/citizenfx'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { PlayerFactory } from '../utils/player-factory'

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
  let commandService: LocalCommandImplementation
  let playerService: LocalPlayerImplementation
  let netEventProcessor: NetEventProcessor
  let testController: TestController
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
    testController = new TestController()

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
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Command Full - ${playerCount} players, simple command (chat → RegisterCommand → onNet → CommandService → Handler)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })

      for (const player of players) {
        playerService.bind(player.clientID)
        const p = playerService.getByClient(player.clientID)
        if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      for (const player of players) {
        const start = performance.now()
        try {
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
        const p = playerService.getByClient(player.clientID)
        if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
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
        const p = playerService.getByClient(player.clientID)
        if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
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
        const p = playerService.getByClient(player.clientID)
        if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      for (const player of players) {
        const start = performance.now()
        try {
          nodeEvents.simulateClientEvent('core:execute-command', player.clientID, 'simple', ['arg1'])

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
