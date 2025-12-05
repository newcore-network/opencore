import { describe, it, expect, beforeEach } from 'vitest'
import { resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { AccessControlService } from '../../src/server/services/access-control.service'
import { PrincipalProviderContract } from '../../src/server/templates/security/principal-provider.contract'
import { PlayerFactory } from '../utils/player-factory'
import { getAllScenarios, getRealisticRankDistribution } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import type { Player } from '../../src/server/entities/player'
import type { Principal } from '../../src/server/templates/security/permission.types'

class MockPrincipalProvider extends PrincipalProviderContract {
  private principals = new Map<string, Principal>()

  async getPrincipal(player: Player): Promise<Principal | null> {
    const accountID = player.accountID
    if (!accountID) return null
    return this.principals.get(accountID) || null
  }

  async refreshPrincipal(_player: Player): Promise<void> {}

  async getPrincipalByLinkedID(linkedID: string): Promise<Principal | null> {
    return this.principals.get(linkedID) || null
  }

  setPrincipal(accountID: string, principal: Principal): void {
    this.principals.set(accountID, principal)
  }
}

describe('Guards Load Benchmarks', () => {
  let accessControl: AccessControlService
  let principalProvider: MockPrincipalProvider

  beforeEach(() => {
    resetCitizenFxMocks()

    principalProvider = new MockPrincipalProvider()
    accessControl = new AccessControlService(principalProvider)
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Guards - ${playerCount} players, rank checks`, async () => {
      const rankDistribution = getRealisticRankDistribution(playerCount)
      const players = PlayerFactory.createPlayersWithRanks(playerCount, rankDistribution)

      for (const player of players) {
        const rank = (player as any).rank || 0
        principalProvider.setPrincipal(player.accountID || `acc-${player.clientID}`, {
          id: player.accountID || `acc-${player.clientID}`,
          rank,
          permissions: [],
        })
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      for (const player of players) {
        const start = performance.now()
        try {
          await accessControl.hasRank(player, 1)
          const end = performance.now()
          timings.push(end - start)
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Guards - ${playerCount} players (rank checks)`,
        playerCount,
        successCount,
        errorCount,
      )

      expect(metrics.errorRate).toBeLessThan(0.2)

      reportLoadMetric(metrics)
    })

    it(`Guards - ${playerCount} players, permission checks`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)

      for (let i = 0; i < players.length; i++) {
        const player = players[i]
        const permissions = i % 2 === 0 ? ['user.basic'] : []
        principalProvider.setPrincipal(player.accountID || `acc-${player.clientID}`, {
          id: player.accountID || `acc-${player.clientID}`,
          rank: 1,
          permissions,
        })
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      for (const player of players) {
        const start = performance.now()
        try {
          await accessControl.hasPermission(player, 'user.basic')
          const end = performance.now()
          timings.push(end - start)
          successCount++
        } catch (error) {
          errorCount++
        }
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Guards - ${playerCount} players (permission checks)`,
        playerCount,
        successCount,
        errorCount,
      )

      reportLoadMetric(metrics)
    })

    it(`Guards - ${playerCount} players, enforce (concurrent)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount)

      for (let i = 0; i < players.length; i++) {
        const player = players[i]
        principalProvider.setPrincipal(player.accountID || `acc-${player.clientID}`, {
          id: player.accountID || `acc-${player.clientID}`,
          rank: i % 2 === 0 ? 5 : 1,
          permissions: i % 2 === 0 ? ['admin.all'] : ['user.basic'],
        })
      }

      const timings: number[] = []
      let successCount = 0
      let errorCount = 0

      const promises = players.map(async (player) => {
        const start = performance.now()
        try {
          await accessControl.enforce(player, { minRank: 3, permission: 'user.basic' })
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
        `Guards - ${playerCount} players (enforce concurrent)`,
        playerCount,
        successCount,
        errorCount,
      )

      reportLoadMetric(metrics)
    })
  }
})
