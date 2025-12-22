import { describe, it, expect, beforeEach } from 'vitest'
import { container } from 'tsyringe'
import { resetContainer } from '../../tests/helpers/di.helper'
import { resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { PlayerService } from '../../src/runtime/server/services/core/player.service'
import { PlayerFactory } from '../utils/player-factory'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { IPlayerInfo } from '../../src/adapters'
import { NodePlayerInfo } from '../../src/adapters/node/node-playerinfo'

describe('Player Manager Load Benchmarks', () => {
  let playerService: PlayerService

  beforeEach(() => {
    resetContainer()
    resetCitizenFxMocks()

    container.registerSingleton(IPlayerInfo as any, NodePlayerInfo)
    container.registerSingleton(PlayerService, PlayerService)

    playerService = container.resolve(PlayerService)
  })

  const playerCounts = [100, 200, 300, 400, 500]

  for (const playerCount of playerCounts) {
    it(`Player Manager - ${playerCount} players, getAll() operation`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      for (const player of players) {
        playerService.bind(player.clientID, {
          license: `license:test-${player.clientID}`,
        })
      }

      const timings: number[] = []
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        const allPlayers = playerService.getAll()
        const end = performance.now()
        timings.push(end - start)

        expect(allPlayers.length).toBe(playerCount)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Player Manager - getAll() (${playerCount} players)`,
        playerCount,
        iterations,
        0,
      )

      reportLoadMetric(metrics)

      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, getByClient() operation`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      for (const player of players) {
        playerService.bind(player.clientID, {
          license: `license:test-${player.clientID}`,
        })
      }

      const timings: number[] = []
      const iterations = 1000

      const clientIDs = players.map((p) => p.clientID)

      for (let i = 0; i < iterations; i++) {
        const randomClientID = clientIDs[Math.floor(Math.random() * clientIDs.length)]
        const start = performance.now()
        const player = playerService.getByClient(randomClientID)
        const end = performance.now()
        timings.push(end - start)

        expect(player).not.toBeNull()
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Player Manager - getByClient() (${playerCount} players)`,
        playerCount,
        iterations,
        0,
      )

      reportLoadMetric(metrics)

      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, setMeta() operation`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      for (const player of players) {
        playerService.bind(player.clientID, {
          license: `license:test-${player.clientID}`,
        })
      }

      const timings: number[] = []
      const iterations = 1000

      const clientIDs = players.map((p) => p.clientID)

      for (let i = 0; i < iterations; i++) {
        const randomClientID = clientIDs[Math.floor(Math.random() * clientIDs.length)]
        const start = performance.now()
        playerService.setMeta(randomClientID, 'test-key', { value: i, timestamp: Date.now() })
        const end = performance.now()
        timings.push(end - start)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Player Manager - setMeta() (${playerCount} players)`,
        playerCount,
        iterations,
        0,
      )

      reportLoadMetric(metrics)

      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, getMeta() operation`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      for (const player of players) {
        playerService.bind(player.clientID, {
          license: `license:test-${player.clientID}`,
        })
        playerService.setMeta(player.clientID, 'test-key', {
          value: player.clientID,
          timestamp: Date.now(),
        })
      }

      const timings: number[] = []
      const iterations = 1000

      const clientIDs = players.map((p) => p.clientID)

      for (let i = 0; i < iterations; i++) {
        const randomClientID = clientIDs[Math.floor(Math.random() * clientIDs.length)]
        const start = performance.now()
        const meta = playerService.getMeta(randomClientID, 'test-key')
        const end = performance.now()
        timings.push(end - start)

        expect(meta).not.toBeUndefined()
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Player Manager - getMeta() (${playerCount} players)`,
        playerCount,
        iterations,
        0,
      )

      reportLoadMetric(metrics)

      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, concurrent getByClient() operations`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      for (const player of players) {
        playerService.bind(player.clientID, {
          license: `license:test-${player.clientID}`,
        })
      }

      const timings: number[] = []
      const concurrentOps = 500

      const clientIDs = players.map((p) => p.clientID)

      const promises = Array.from({ length: concurrentOps }, async () => {
        const randomClientID = clientIDs[Math.floor(Math.random() * clientIDs.length)]
        const start = performance.now()
        const player = playerService.getByClient(randomClientID)
        const end = performance.now()
        timings.push(end - start)

        expect(player).not.toBeNull()
      })

      await Promise.all(promises)

      const metrics = calculateLoadMetrics(
        timings,
        `Player Manager - Concurrent getByClient() (${playerCount} players, ${concurrentOps} ops)`,
        playerCount,
        concurrentOps,
        0,
      )

      reportLoadMetric(metrics)

      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, mixed operations (getAll, getByClient, setMeta, getMeta)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      for (const player of players) {
        playerService.bind(player.clientID, {
          license: `license:test-${player.clientID}`,
        })
      }

      const timings: number[] = []
      const iterations = 200

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()

        const clientIDs = players.map((p) => p.clientID)
        const randomClientID = clientIDs[Math.floor(Math.random() * clientIDs.length)]

        if (i % 4 === 0) {
          playerService.getAll()
        } else if (i % 4 === 1) {
          playerService.getByClient(randomClientID)
        } else if (i % 4 === 2) {
          playerService.setMeta(randomClientID, 'test-key', { value: i })
        } else {
          playerService.getMeta(randomClientID, 'test-key')
        }

        const end = performance.now()
        timings.push(end - start)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Player Manager - Mixed Operations (${playerCount} players)`,
        playerCount,
        iterations,
        0,
      )

      reportLoadMetric(metrics)

      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, linkAccount() operation`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      for (const player of players) {
        playerService.bind(player.clientID, {
          license: `license:test-${player.clientID}`,
        })
      }

      const timings: number[] = []

      for (const player of players) {
        const start = performance.now()
        playerService.linkAccount(player.clientID, `account-${player.clientID}`)
        const end = performance.now()
        timings.push(end - start)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Player Manager - linkAccount() (${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      reportLoadMetric(metrics)

      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })
  }
})
