import { describe, it, expect, beforeEach } from 'vitest'
import { container } from 'tsyringe'
import { resetContainer } from '../../tests/helpers/di.helper'
import { resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { PlayerService } from '../../src/runtime/server/services/core/player.service'
import { PlayerFactory } from '../utils/player-factory'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { IPlayerInfo } from '../../src/adapters'
import { NodePlayerInfo } from '../../src/adapters/node/node-playerinfo'

describe('Player Lifecycle Load Benchmarks', () => {
  let playerService: PlayerService

  beforeEach(() => {
    resetContainer()
    resetCitizenFxMocks()

    container.registerSingleton(IPlayerInfo as any, NodePlayerInfo)
    container.registerSingleton(PlayerService, PlayerService)

    playerService = container.resolve(PlayerService)
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Player Lifecycle - ${playerCount} players, full cycle (bind → linkAccount → unbind)`, async () => {
      const timings: number[] = []
      const stageTimings = {
        bind: [] as number[],
        linkAccount: [] as number[],
        unbind: [] as number[],
      }

      for (let i = 0; i < playerCount; i++) {
        const clientID = i + 1

        const bindStart = performance.now()
        const player = playerService.bind(clientID, {
          license: `license:test-${clientID}`,
        })
        const bindEnd = performance.now()
        stageTimings.bind.push(bindEnd - bindStart)

        const linkStart = performance.now()
        playerService.linkAccount(clientID, `account-${clientID}`)
        const linkEnd = performance.now()
        stageTimings.linkAccount.push(linkEnd - linkStart)

        const unbindStart = performance.now()
        playerService.unbindByClient(clientID)
        const unbindEnd = performance.now()
        stageTimings.unbind.push(unbindEnd - unbindStart)

        const totalTime = unbindEnd - bindStart
        timings.push(totalTime)
      }

      const totalMetrics = calculateLoadMetrics(
        timings,
        `Player Lifecycle - Full Cycle (${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      const bindMetrics = calculateLoadMetrics(
        stageTimings.bind,
        'Stage - Bind',
        playerCount,
        playerCount,
        0,
      )

      const linkMetrics = calculateLoadMetrics(
        stageTimings.linkAccount,
        'Stage - Link Account',
        playerCount,
        playerCount,
        0,
      )

      const unbindMetrics = calculateLoadMetrics(
        stageTimings.unbind,
        'Stage - Unbind',
        playerCount,
        playerCount,
        0,
      )

      expect(totalMetrics.successCount).toBe(playerCount)
      reportLoadMetric(totalMetrics)
      console.log(
        `  └─ Bind: ${bindMetrics.mean.toFixed(2)}ms (${((bindMetrics.mean / totalMetrics.mean) * 100).toFixed(1)}%)`,
      )
      console.log(
        `  └─ Link Account: ${linkMetrics.mean.toFixed(2)}ms (${((linkMetrics.mean / totalMetrics.mean) * 100).toFixed(1)}%)`,
      )
      console.log(
        `  └─ Unbind: ${unbindMetrics.mean.toFixed(2)}ms (${((unbindMetrics.mean / totalMetrics.mean) * 100).toFixed(1)}%)`,
      )
    })

    it(`Player Lifecycle - ${playerCount} players, concurrent connections`, async () => {
      const timings: number[] = []

      const promises = Array.from({ length: playerCount }, async (_, i) => {
        const clientID = i + 1
        const start = performance.now()

        const player = playerService.bind(clientID, {
          license: `license:test-${clientID}`,
        })
        playerService.linkAccount(clientID, `account-${clientID}`)

        const end = performance.now()
        timings.push(end - start)

        return player
      })

      await Promise.all(promises)

      const metrics = calculateLoadMetrics(
        timings,
        `Player Lifecycle - Concurrent Connections (${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      expect(metrics.successCount).toBe(playerCount)
      reportLoadMetric(metrics)

      for (let i = 0; i < playerCount; i++) {
        playerService.unbindByClient(i + 1)
      }
    })

    it(`Player Lifecycle - ${playerCount} players, concurrent disconnections`, async () => {
      const players: { clientID: number; player: ReturnType<typeof playerService.bind> }[] = []
      for (let i = 0; i < playerCount; i++) {
        const clientID = i + 1
        const player = playerService.bind(clientID, {
          license: `license:test-${clientID}`,
        })
        playerService.linkAccount(clientID, `account-${clientID}`)
        players.push({ clientID, player })
      }

      const timings: number[] = []

      const promises = players.map(async ({ clientID }) => {
        const start = performance.now()
        playerService.unbindByClient(clientID)
        const end = performance.now()
        timings.push(end - start)
      })

      await Promise.all(promises)

      const metrics = calculateLoadMetrics(
        timings,
        `Player Lifecycle - Concurrent Disconnections (${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      expect(metrics.successCount).toBe(playerCount)
      reportLoadMetric(metrics)
    })

    it(`Player Lifecycle - ${playerCount} players, connect/disconnect cycle`, async () => {
      const timings: number[] = []
      const cycles = 3

      for (let cycle = 0; cycle < cycles; cycle++) {
        const connectStart = performance.now()
        const players: { clientID: number; player: ReturnType<typeof playerService.bind> }[] = []
        for (let i = 0; i < playerCount; i++) {
          const clientID = cycle * playerCount + i + 1
          const player = playerService.bind(clientID, {
            license: `license:test-${clientID}`,
          })
          playerService.linkAccount(clientID, `account-${clientID}`)
          players.push({ clientID, player })
        }
        const connectEnd = performance.now()

        const disconnectStart = performance.now()
        for (const { clientID } of players) {
          playerService.unbindByClient(clientID)
        }
        const disconnectEnd = performance.now()

        const cycleTime = disconnectEnd - connectStart
        timings.push(cycleTime)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Player Lifecycle - Connect/Disconnect Cycle (${playerCount} players, ${cycles} cycles)`,
        playerCount,
        cycles,
        0,
      )

      reportLoadMetric(metrics)
    })

    it(`Player Lifecycle - ${playerCount} players, using PlayerFactory lifecycle simulation`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)
      const timings: number[] = []

      for (const player of players) {
        const lifecycleTime = await PlayerFactory.simulatePlayerLifecycle(player, {
          onJoin: async (p) => {
            playerService.bind(p.clientID, {
              license: `license:test-${p.clientID}`,
            })
          },
          onAuthenticate: async (p) => {
            playerService.linkAccount(p.clientID, `account-${p.clientID}`)
          },
          onDisconnect: async (p) => {
            playerService.unbindByClient(p.clientID)
          },
        })

        timings.push(lifecycleTime)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Player Lifecycle - Factory Simulation (${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      expect(metrics.successCount).toBe(playerCount)
      reportLoadMetric(metrics)
    })
  }
})
