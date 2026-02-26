import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { NodeEvents } from '../../src/adapters/node/transport/node.events'
import { NodePlayerInfo } from '../../src/adapters/node/node-playerinfo'
import { NodeEntityServer } from '../../src/adapters/node/node-entity-server'
import { NodePlayerServer } from '../../src/adapters/node/node-player-server'
import { LocalPlayerImplementation } from '../../src/runtime/server/implementations/local/player.local'
import { DefaultNetEventSecurityObserver } from '../../src/runtime/server/default/default-net-event-security-observer'
import { DefaultSecurityHandler } from '../../src/runtime/server/default/default-security.handler'
import { NetEventProcessor } from '../../src/runtime/server/system/processors/netEvent.processor'
import { WorldContext } from '../../src/runtime/core/world'
import { resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { PlayerFactory } from '../utils/player-factory'

class TestController {
  private callCount = 0

  async handleEvent(player: any, data: any) {
    this.callCount++
    return { success: true, data }
  }

  getCallCount() {
    return this.callCount
  }
}

const eventSchema = z.object({
  action: z.string(),
  amount: z.number(),
  targetId: z.number(),
})

describe('Net Events Load Benchmarks', () => {
  let processor: NetEventProcessor
  let playerService: LocalPlayerImplementation
  let controller: TestController
  let nodeEvents: NodeEvents

  beforeEach(() => {
    resetCitizenFxMocks()

    const securityHandler = new DefaultSecurityHandler()
    nodeEvents = new NodeEvents()
    playerService = new LocalPlayerImplementation(
      new WorldContext(),
      new NodePlayerInfo(),
      new NodePlayerServer(),
      new NodeEntityServer(),
      nodeEvents,
    )
    const observer = new DefaultNetEventSecurityObserver()
    processor = new NetEventProcessor(playerService, securityHandler, observer, nodeEvents)
    controller = new TestController()

    processor.process(controller, 'handleEvent', {
      eventName: 'test:event',
      schema: eventSchema,
      paramTypes: [Object],
    })
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Net Events - ${playerCount} players, validated event`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)

      for (const player of players) {
        playerService.bind(player.clientID, { license: `license:test-${player.clientID}` })
        const p = playerService.getByClient(player.clientID)
        if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      for (const player of players) {
        const start = performance.now()
        try {
          nodeEvents.simulateClientEvent('test:event', player.clientID, {
            action: 'transfer',
            amount: 100,
            targetId: 123,
          })
          const end = performance.now()
          timings.push(end - start)
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Net Events - ${playerCount} players (validated)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.errorRate).toBeLessThan(0.1)

      reportLoadMetric(metrics)
    })

    it(`Net Events - ${playerCount} players, concurrent events`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)

      for (const player of players) {
        playerService.bind(player.clientID, { license: `license:test-${player.clientID}` })
        const p = playerService.getByClient(player.clientID)
        if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      const promises = players.map(async (player) => {
        const start = performance.now()
        try {
          nodeEvents.simulateClientEvent('test:event', player.clientID, {
            action: 'transfer',
            amount: 100,
            targetId: 123,
          })
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
        `Net Events - ${playerCount} players (concurrent)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.errorRate).toBeLessThan(0.1)

      reportLoadMetric(metrics)
    })
  }
})
