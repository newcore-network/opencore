import { describe, it, expect, beforeEach } from 'vitest'
import { resetCitizenFxMocks, registeredNetEvents } from '../../tests/mocks/citizenfx'
import { PlayerService } from '../../src/runtime/server/services/core/player.service'
import { DefaultSecurityHandler } from '../../src/runtime/server/services/default/default-security.handler'
import { NetEventProcessor } from '../../src/runtime/server/system/processors/netEvent.processor'
import { PlayerFactory } from '../utils/player-factory'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { z } from 'zod'
import { NodePlayerInfo } from '../../src/adapters/node/node-playerinfo'
import { DefaultNetEventSecurityObserver } from '../../src/runtime/server/services/default/default-net-event-security-observer'
import { FiveMNetTransport } from '../../src/adapters/fivem/fivem-net-transport'

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
  let playerService: PlayerService
  let controller: TestController

  beforeEach(() => {
    resetCitizenFxMocks()
    registeredNetEvents.clear()

    const securityHandler = new DefaultSecurityHandler()
    const playerInfo = new NodePlayerInfo()
    playerService = new PlayerService(playerInfo)
    const observer = new DefaultNetEventSecurityObserver()
    const netTransport = new FiveMNetTransport()
    processor = new NetEventProcessor(playerService, securityHandler, observer, netTransport)
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
        playerService.linkAccount(player.clientID, player.accountID || `account-${player.clientID}`)
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      for (const player of players) {
        const handler = registeredNetEvents.get('test:event')
        if (!handler) {
          errorCount++
          continue
        }

        const start = performance.now()
        try {
          ;(global as any).source = player.clientID
          await handler({
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
        playerService.linkAccount(player.clientID, player.accountID || `account-${player.clientID}`)
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      const promises = players.map(async (player) => {
        const handler = registeredNetEvents.get('test:event')
        if (!handler) {
          errorCount++
          return
        }

        const start = performance.now()
        try {
          ;(global as any).source = player.clientID
          await handler({
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
