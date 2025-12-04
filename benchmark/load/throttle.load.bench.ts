import { describe, it, expect, beforeEach } from 'vitest'
import { container } from 'tsyringe'
import { resetContainer } from '../../tests/helpers/di.helper'
import { resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { RateLimiterService } from '../../src/server/services/rate-limiter.service'
import { PlayerFactory } from '../utils/player-factory'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'

describe('Throttle Load Benchmarks', () => {
  let rateLimiter: RateLimiterService

  beforeEach(() => {
    resetContainer()
    resetCitizenFxMocks()
    rateLimiter = new RateLimiterService()
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Throttle - ${playerCount} players, single key per player`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      const timings: number[] = []
      let successCount = 0
      let blockedCount = 0

      for (const player of players) {
        const key = `player:${player.clientID}:command`
        const start = performance.now()
        const allowed = rateLimiter.checkLimit(key, 10, 1000)
        const end = performance.now()
        timings.push(end - start)

        if (allowed) {
          successCount++
        } else {
          blockedCount++
        }
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Throttle - ${playerCount} players (single key)`,
        playerCount,
        successCount,
        blockedCount,
      )

      expect(metrics.successCount).toBe(playerCount) // Todos deberían pasar (primera vez)

      reportLoadMetric(metrics)
    })

    it(`Throttle - ${playerCount} players, exceed limit`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      const limit = 5
      const timings: number[] = []
      let successCount = 0
      let blockedCount = 0

      for (const player of players) {
        const key = `player:${player.clientID}:command`

        // Intentar exceder el límite
        for (let i = 0; i < limit + 3; i++) {
          const start = performance.now()
          const allowed = rateLimiter.checkLimit(key, limit, 1000)
          const end = performance.now()
          timings.push(end - start)

          if (allowed) {
            successCount++
          } else {
            blockedCount++
          }
        }
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Throttle - ${playerCount} players (exceed limit)`,
        playerCount,
        successCount,
        blockedCount,
      )

      expect(blockedCount).toBeGreaterThan(0) // Algunos deberían ser bloqueados

      reportLoadMetric(metrics)
      console.log(`  → blocked: ${blockedCount}`)
    })

    it(`Throttle - ${playerCount} players, concurrent checks`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      const timings: number[] = []
      let successCount = 0
      let blockedCount = 0

      const promises = players.map(async (player) => {
        const key = `player:${player.clientID}:command`
        const start = performance.now()
        const allowed = rateLimiter.checkLimit(key, 10, 1000)
        const end = performance.now()
        timings.push(end - start)

        if (allowed) {
          successCount++
        } else {
          blockedCount++
        }
      })

      await Promise.all(promises)

      const metrics = calculateLoadMetrics(
        timings,
        `Throttle - ${playerCount} players (concurrent)`,
        playerCount,
        successCount,
        blockedCount,
      )

      expect(metrics.successCount).toBe(playerCount)

      reportLoadMetric(metrics)
    })
  }
})

