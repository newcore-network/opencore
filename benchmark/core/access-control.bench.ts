import { Bench } from 'tinybench'
import type { Player } from '../../src/runtime/server/entities/player'
import { PlayerFactory } from '../utils/player-factory'
import { Principal, PrincipalProviderContract } from '../../src/runtime/server/contracts'
import { Authorization } from '../../src/runtime/server/api'
import { GLOBAL_CONTAINER } from '../../src'

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

export async function runAccessControlBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  const provider = new MockPrincipalProvider()
  const principalService = GLOBAL_CONTAINER.resolve(Authorization as any) as Authorization

  const player1 = PlayerFactory.createPlayer({ accountID: 'acc-1', clientID: 1 })
  const player2 = PlayerFactory.createPlayer({ accountID: 'acc-2', clientID: 2 })
  const player3 = PlayerFactory.createPlayer({ accountID: 'acc-3', clientID: 3 })

  provider.setPrincipal('acc-1', { id: 'acc-1', rank: 5, permissions: ['user.basic'] })
  provider.setPrincipal('acc-2', { id: 'acc-2', rank: 10, permissions: ['admin.all', '*'] })
  provider.setPrincipal('acc-3', { id: 'acc-3', rank: 0, permissions: [] })

  bench.add('AccessControl - hasRank (success)', async () => {
    await principalService.hasRank(player1, 3)
  })

  bench.add('AccessControl - hasRank (failure)', async () => {
    try {
      await principalService.hasRank(player3, 5)
    } catch {
      // Expected
    }
  })

  bench.add('AccessControl - hasPermission (success)', async () => {
    await principalService.hasPermission(player1, 'user.basic')
  })

  bench.add('AccessControl - hasPermission (wildcard)', async () => {
    await principalService.hasPermission(player2, 'any.permission')
  })

  bench.add('AccessControl - hasPermission (failure)', async () => {
    await principalService.hasPermission(player3, 'admin.all')
  })

  bench.add('AccessControl - enforce (rank only)', async () => {
    try {
      await principalService.enforce(player1, { rank: 3 })
    } catch {
      // Expected on failure
    }
  })

  bench.add('AccessControl - enforce (permission only)', async () => {
    try {
      await principalService.enforce(player1, { permission: 'user.basic' })
    } catch {
      // Expected on failure
    }
  })

  bench.add('AccessControl - enforce (both)', async () => {
    try {
      await principalService.enforce(player2, { rank: 5, permission: 'admin.all' })
    } catch {
      // Expected on failure
    }
  })

  bench.add('AccessControl - 100 rank checks', async () => {
    for (let i = 0; i < 100; i++) {
      await principalService.hasRank(player1, 3)
    }
  })

  bench.add('AccessControl - 100 permission checks', async () => {
    for (let i = 0; i < 100; i++) {
      await principalService.hasPermission(player1, 'user.basic')
    }
  })

  return bench
}
