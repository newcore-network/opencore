import { beforeEach, describe, expect, it } from 'vitest'
import { emitFrameworkEvent, onFrameworkEvent } from '../../src/runtime/server/bus/core-event-bus'
import type { CoreEventMap } from '../../src/runtime/server/types/core-events'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { PlayerFactory } from '../utils/player-factory'

describe('Core Events Load Benchmarks', () => {
  beforeEach(() => {
    // Note: event bus doesn't have public cleanup method
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Core Events - ${playerCount} players, single handler`, async () => {
      let handlerCallCount = 0
      const unsubscribe = onFrameworkEvent('core:playerSessionCreated', () => {
        handlerCallCount++
      })

      const players = PlayerFactory.createPlayers(playerCount)
      const timings: number[] = []
      let successCount = 0

      for (const player of players) {
        const start = performance.now()
        emitFrameworkEvent('core:playerSessionCreated', {
          clientId: player.clientID,
          license: `license:${player.clientID}`,
        })
        const end = performance.now()
        timings.push(end - start)
        successCount++
      }

      unsubscribe()

      const metrics = calculateLoadMetrics(
        timings,
        `Core Events - ${playerCount} players (single handler)`,
        playerCount,
        successCount,
        0,
      )

      expect(handlerCallCount).toBe(playerCount)

      reportLoadMetric(metrics)
    })

    it(`Core Events - ${playerCount} players, 10 handlers`, async () => {
      const handlerCallCounts = Array.from({ length: 10 }, () => 0)
      const unsubscribes: (() => void)[] = []

      for (let i = 0; i < 10; i++) {
        const index = i
        unsubscribes.push(
          onFrameworkEvent('core:playerSessionCreated', () => {
            handlerCallCounts[index]++
          }),
        )
      }

      const players = PlayerFactory.createPlayers(playerCount)
      const timings: number[] = []
      let successCount = 0

      for (const player of players) {
        const start = performance.now()
        emitFrameworkEvent('core:playerSessionCreated', {
          clientId: player.clientID,
          license: `license:${player.clientID}`,
        })
        const end = performance.now()
        timings.push(end - start)
        successCount++
      }

      unsubscribes.forEach((unsub) => unsub())

      const metrics = calculateLoadMetrics(
        timings,
        `Core Events - ${playerCount} players (10 handlers)`,
        playerCount,
        successCount,
        0,
      )

      handlerCallCounts.forEach((count, index) => {
        expect(count).toBe(playerCount)
      })

      reportLoadMetric(metrics)
    })

    it(`Core Events - ${playerCount} players, concurrent emissions`, async () => {
      let handlerCallCount = 0
      const unsubscribe = onFrameworkEvent('core:playerSessionCreated', () => {
        handlerCallCount++
      })

      const players = PlayerFactory.createPlayers(playerCount)
      const timings: number[] = []
      let successCount = 0

      const promises = players.map(async (player) => {
        const start = performance.now()
        emitFrameworkEvent('core:playerSessionCreated', {
          clientId: player.clientID,
          license: `license:${player.clientID}`,
        })
        const end = performance.now()
        timings.push(end - start)
        successCount++
      })

      await Promise.all(promises)

      unsubscribe()

      const metrics = calculateLoadMetrics(
        timings,
        `Core Events - ${playerCount} players (concurrent)`,
        playerCount,
        successCount,
        0,
      )

      expect(handlerCallCount).toBe(playerCount)

      reportLoadMetric(metrics)
    })
  }
})
