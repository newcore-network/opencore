import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { NodeEvents } from '../../src/adapters/node/transport/node.events'
import { NodePlayerInfo } from '../../src/adapters/node/node-playerinfo'
import { NodeEntityServer } from '../../src/adapters/node/node-entity-server'
import { NodePlayerServer } from '../../src/adapters/node/node-player-server'
import { Player } from '../../src/runtime/server/entities/player'
import { LocalPlayerImplementation } from '../../src/runtime/server/implementations/local/player.local'
import { DefaultNetEventSecurityObserver } from '../../src/runtime/server/default/default-net-event-security-observer'
import { DefaultSecurityHandler } from '../../src/runtime/server/default/default-security.handler'
import { NetEventProcessor } from '../../src/runtime/server/system/processors/netEvent.processor'
import { WorldContext } from '../../src/runtime/core/world'
import { emitNet, registeredNetEvents, resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { PlayerFactory } from '../utils/player-factory'
import { generatePayload, measureSerialization, type PayloadSize } from '../utils/serialization'

class TestController {
  private callCount = 0

  async handleEvent(player: any, data: any) {
    this.callCount++
    return { success: true, data }
  }

  async handleValidatedEvent(player: any, data: { action: string; amount: number }) {
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

describe('Net Events Full Load Benchmarks', () => {
  let processor: NetEventProcessor
  let playerService: LocalPlayerImplementation
  let controller: TestController

  beforeEach(() => {
    resetCitizenFxMocks()
    registeredNetEvents.clear()

    const securityHandler = new DefaultSecurityHandler()
    const nodeEvents = new NodeEvents()
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
      schema: z.any(),
      paramTypes: [Player, Object],
    })

    processor.process(controller, 'handleValidatedEvent', {
      eventName: 'test:validated',
      schema: eventSchema,
      paramTypes: [Player, Object],
    })
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Net Events - ${playerCount} players, simple event (no validation)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)

      for (const player of players) {
        playerService.bind(player.clientID)
        const p = playerService.getByClient(player.clientID)
        if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
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
          await handler({ action: 'test', value: 123 })
          const end = performance.now()
          timings.push(end - start)
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Net Events - Simple (${playerCount} players)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.errorRate).toBeLessThan(0.1)
      reportLoadMetric(metrics)
    })

    it(`Net Events - ${playerCount} players, validated event (with Zod)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)

      for (const player of players) {
        playerService.bind(player.clientID)
        const p = playerService.getByClient(player.clientID)
        if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      for (const player of players) {
        const handler = registeredNetEvents.get('test:validated')
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
        `Net Events - Validated (${playerCount} players)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.errorRate).toBeLessThan(0.1)
      reportLoadMetric(metrics)
    })

    it(`Net Events - ${playerCount} players, serialization cost (small payload)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      const payload = generatePayload('small')

      for (const player of players) {
        playerService.bind(player.clientID)
        const p = playerService.getByClient(player.clientID)
        if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
      }

      const serializationTimings: number[] = []
      const eventTimings: number[] = []

      for (const player of players) {
        const serializationMetrics = measureSerialization(payload)
        serializationTimings.push(serializationMetrics.totalTime)

        const handler = registeredNetEvents.get('test:event')
        if (handler) {
          const start = performance.now()
          ;(global as any).source = player.clientID
          await handler(payload)
          const end = performance.now()
          eventTimings.push(end - start)
        }
      }

      const serializationMetrics = calculateLoadMetrics(
        serializationTimings,
        `Net Events - Serialization (small, ${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      const eventMetrics = calculateLoadMetrics(
        eventTimings,
        `Net Events - Full Event (small, ${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      reportLoadMetric(serializationMetrics)
      reportLoadMetric(eventMetrics)
    })

    it(
      `Net Events - ${playerCount} players, different payload sizes`,
      { timeout: 30000 },
      async () => {
        const payloadSizes: PayloadSize[] = ['small', 'medium', 'large']
        const players = PlayerFactory.createPlayers(playerCount)

        for (const player of players) {
          playerService.bind(player.clientID)
          const p = playerService.getByClient(player.clientID)
          if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
        }

        for (const size of payloadSizes) {
          const payload = generatePayload(size)
          const timings: number[] = []
          const serializationTimings: number[] = []

          for (const player of players) {
            const serializationMetrics = measureSerialization(payload)
            serializationTimings.push(serializationMetrics.totalTime)

            const handler = registeredNetEvents.get('test:event')
            if (handler) {
              const start = performance.now()
              ;(global as any).source = player.clientID
              await handler(payload)
              const end = performance.now()
              timings.push(end - start)
            }
          }

          const serializationMetrics = calculateLoadMetrics(
            serializationTimings,
            `Net Events - Serialization (${size})`,
            playerCount,
            playerCount,
            0,
          )

          const eventMetrics = calculateLoadMetrics(
            timings,
            `Net Events - Full Event (${size}, ${playerCount} players)`,
            playerCount,
            playerCount,
            0,
          )

          reportLoadMetric(serializationMetrics)
          console.log(
            `  → Serialization: ${((serializationMetrics.mean / eventMetrics.mean) * 100).toFixed(1)}% of total`,
          )
          reportLoadMetric(eventMetrics)
        }
      },
    )

    it(
      `Net Events - ${playerCount} players, with network latency simulation`,
      { timeout: 60000 },
      async () => {
        const players = PlayerFactory.createPlayers(playerCount)
        const payload = generatePayload('medium')
        const latencies = [0, 5, 10]

        for (const player of players) {
          playerService.bind(player.clientID)
          const p = playerService.getByClient(player.clientID)
          if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
        }

        for (const latency of latencies) {
          const timings: number[] = []

          for (const player of players) {
            const handler = registeredNetEvents.get('test:event')
            if (handler) {
              const start = performance.now()
              ;(global as any).source = player.clientID

              if (latency > 0) {
                await new Promise((resolve) => setTimeout(resolve, latency))
              }

              await handler(payload)
              const end = performance.now()
              timings.push(end - start)
            }
          }

          const metrics = calculateLoadMetrics(
            timings,
            `Net Events - With Latency ${latency}ms (${playerCount} players)`,
            playerCount,
            playerCount,
            0,
          )

          reportLoadMetric(metrics)
        }
      },
    )

    it(`Net Events - ${playerCount} players, concurrent events`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)

      for (const player of players) {
        playerService.bind(player.clientID)
        const p = playerService.getByClient(player.clientID)
        if (p) p.linkAccount(player.accountID || `account-${player.clientID}`)
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
          await handler({ action: 'test', value: 123 })
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
        `Net Events - Concurrent (${playerCount} players)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.errorRate).toBeLessThan(0.1)
      reportLoadMetric(metrics)
    })

    it(`Net Events - ${playerCount} players, emitNet cost`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      const payload = generatePayload('medium')

      const timings: number[] = []

      for (const player of players) {
        const start = performance.now()
        emitNet('test:event', player.clientID, payload)
        const end = performance.now()
        timings.push(end - start)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Net Events - emitNet Cost (${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      reportLoadMetric(metrics)
    })
  }
})
