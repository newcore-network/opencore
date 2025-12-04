import { describe, it, expect, beforeEach } from 'vitest'
import { container } from 'tsyringe'
import { resetContainer } from '../../tests/helpers/di.helper'
import { resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { PlayerService } from '../../src/server/services/player.service'
import { PlayerFactory } from '../utils/player-factory'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'

describe('Player Manager Load Benchmarks', () => {
  let playerService: PlayerService

  beforeEach(() => {
    resetContainer()
    resetCitizenFxMocks()

    // Registrar servicios
    container.registerSingleton(PlayerService, PlayerService)

    // Resolver servicios
    playerService = container.resolve(PlayerService)
  })

  const playerCounts = [100, 200, 300, 400, 500]

  for (const playerCount of playerCounts) {
    it(`Player Manager - ${playerCount} players, getAll() operation`, async () => {
      // Crear jugadores
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

      // Limpiar
      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, getByClient() operation`, async () => {
      // Crear jugadores
      const players = PlayerFactory.createPlayers(playerCount)
      for (const player of players) {
        playerService.bind(player.clientID, {
          license: `license:test-${player.clientID}`,
        })
      }

      const timings: number[] = []
      const iterations = 1000

      // Usar los clientIDs reales de los jugadores creados
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

      // Limpiar
      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, setMeta() operation`, async () => {
      // Crear jugadores
      const players = PlayerFactory.createPlayers(playerCount)
      for (const player of players) {
        playerService.bind(player.clientID, {
          license: `license:test-${player.clientID}`,
        })
      }

      const timings: number[] = []
      const iterations = 1000

      // Usar los clientIDs reales de los jugadores creados
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

      // Limpiar
      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, getMeta() operation`, async () => {
      // Crear jugadores y establecer metadata
      const players = PlayerFactory.createPlayers(playerCount)
      for (const player of players) {
        playerService.bind(player.clientID, {
          license: `license:test-${player.clientID}`,
        })
        playerService.setMeta(player.clientID, 'test-key', { value: player.clientID, timestamp: Date.now() })
      }

      const timings: number[] = []
      const iterations = 1000

      // Usar los clientIDs reales de los jugadores creados
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

      // Limpiar
      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, concurrent getByClient() operations`, async () => {
      // Crear jugadores
      const players = PlayerFactory.createPlayers(playerCount)
      for (const player of players) {
        playerService.bind(player.clientID, {
          license: `license:test-${player.clientID}`,
        })
      }

      const timings: number[] = []
      const concurrentOps = 500

      // Usar los clientIDs reales de los jugadores creados
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

      // Limpiar
      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, mixed operations (getAll, getByClient, setMeta, getMeta)`, async () => {
      // Crear jugadores
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

        // Usar los clientIDs reales de los jugadores creados
        const clientIDs = players.map((p) => p.clientID)
        const randomClientID = clientIDs[Math.floor(Math.random() * clientIDs.length)]

        // Mezclar diferentes operaciones
        if (i % 4 === 0) {
          // getAll
          playerService.getAll()
        } else if (i % 4 === 1) {
          // getByClient
          playerService.getByClient(randomClientID)
        } else if (i % 4 === 2) {
          // setMeta
          playerService.setMeta(randomClientID, 'test-key', { value: i })
        } else {
          // getMeta
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

      // Limpiar
      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })

    it(`Player Manager - ${playerCount} players, linkAccount() operation`, async () => {
      // Crear jugadores sin accountID
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

      // Limpiar
      for (const player of players) {
        playerService.unbindByClient(player.clientID)
      }
    })
  }
})

