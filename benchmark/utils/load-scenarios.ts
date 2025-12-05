export const LOAD_SCENARIOS = {
  TINY: 10,
  SMALL: 50,
  MEDIUM: 100,
  LARGE: 200,
  EXTREME: 500,
} as const

export type LoadScenario = keyof typeof LOAD_SCENARIOS

export function getPlayerCount(scenario: LoadScenario): number {
  return LOAD_SCENARIOS[scenario]
}

export function getAllScenarios(): number[] {
  return Object.values(LOAD_SCENARIOS)
}

export enum LoadPattern {
  UNIFORM = 'uniform',
  SPIKE = 'spike',
  GRADUAL = 'gradual',
  BURST = 'burst',
}

export function generateLoadPattern(
  pattern: LoadPattern,
  count: number,
  baseDelay: number = 10,
): number[] {
  switch (pattern) {
    case LoadPattern.UNIFORM:
      return new Array(count).fill(baseDelay)

    case LoadPattern.SPIKE:
      return new Array(count).fill(0).map((_, i) => {
        if (i % Math.floor(count * 0.2) === 0) {
          return baseDelay * 0.1
        }
        return baseDelay * 2
      })

    case LoadPattern.GRADUAL:
      return new Array(count).fill(0).map((_, i) => {
        const progress = i / count
        return baseDelay * (0.5 + progress * 1.5)
      })

    case LoadPattern.BURST:
      return new Array(count).fill(0).map((_, i) => {
        const burstSize = 10
        if (i % (burstSize * 2) < burstSize) {
          return baseDelay * 0.1
        }
        return baseDelay * 3
      })

    default:
      return new Array(count).fill(baseDelay)
  }
}

export function getRealisticRankDistribution(totalPlayers: number): {
  rank: number
  count: number
}[] {
  return [
    { rank: 0, count: Math.floor(totalPlayers * 0.4) },
    { rank: 1, count: Math.floor(totalPlayers * 0.3) },
    { rank: 2, count: Math.floor(totalPlayers * 0.15) },
    { rank: 5, count: Math.floor(totalPlayers * 0.1) },
    { rank: 10, count: Math.floor(totalPlayers * 0.05) },
  ]
}

export function getRealisticPermissionSets(): string[][] {
  return [
    [],
    ['user.basic'],
    ['user.basic', 'user.chat'],
    ['user.basic', 'user.chat', 'mod.ban'],
    ['user.basic', 'user.chat', 'mod.ban', 'admin.all'],
    ['*'],
  ]
}

export function generateTestData(type: 'simple' | 'complex' | 'nested'): any {
  switch (type) {
    case 'simple':
      return {
        name: 'TestPlayer',
        age: 25,
        email: 'test@example.com',
      }

    case 'complex':
      return {
        playerId: 123,
        action: 'transfer',
        amount: 5000,
        targetId: 456,
        metadata: {
          timestamp: Date.now(),
          source: 'bank',
          verified: true,
        },
      }

    case 'nested':
      return {
        player: {
          id: 123,
          name: 'TestPlayer',
          account: {
            id: 'acc-123',
            balance: 10000,
            transactions: [
              { id: 1, amount: 100, type: 'deposit' },
              { id: 2, amount: 50, type: 'withdrawal' },
            ],
          },
        },
        action: 'transfer',
        target: {
          id: 456,
          name: 'TargetPlayer',
        },
      }

    default:
      return {}
  }
}

export function generateLargeTestData(size: 'small' | 'medium' | 'large' | 'xlarge'): any {
  const baseData = {
    timestamp: Date.now(),
    serverId: 'test-server',
  }

  switch (size) {
    case 'small':
      return {
        ...baseData,
        players: Array.from({ length: 10 }, (_, i) => ({
          id: i,
          name: `Player${i}`,
        })),
      }

    case 'medium':
      return {
        ...baseData,
        players: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Player${i}`,
          position: { x: Math.random() * 1000, y: Math.random() * 1000, z: 72.0 },
          inventory: Array.from({ length: 20 }, (_, j) => ({
            id: j,
            name: `Item${j}`,
            quantity: Math.floor(Math.random() * 10),
          })),
        })),
      }

    case 'large':
      return {
        ...baseData,
        players: Array.from({ length: 200 }, (_, i) => ({
          id: i,
          name: `Player${i}`,
          position: { x: Math.random() * 1000, y: Math.random() * 1000, z: 72.0 },
          inventory: Array.from({ length: 50 }, (_, j) => ({
            id: j,
            name: `Item${j}`,
            quantity: Math.floor(Math.random() * 100),
            metadata: { durability: Math.random() * 100 },
          })),
        })),
      }

    case 'xlarge':
      return {
        ...baseData,
        players: Array.from({ length: 500 }, (_, i) => ({
          id: i,
          name: `Player${i}`,
          accountId: `acc-${i}`,
          position: { x: Math.random() * 1000, y: Math.random() * 1000, z: 72.0 },
          inventory: Array.from({ length: 100 }, (_, j) => ({
            id: j,
            name: `Item${j}`,
            quantity: Math.floor(Math.random() * 100),
            metadata: {
              durability: Math.random() * 100,
              custom: { prop: `value-${j}` },
            },
          })),
        })),
      }

    default:
      return baseData
  }
}
