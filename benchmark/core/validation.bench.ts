import { Bench } from 'tinybench'
import { z } from 'zod'

const simpleSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
})

const complexSchema = z.object({
  playerId: z.number().int().positive(),
  action: z.enum(['transfer', 'deposit', 'withdraw']),
  amount: z.number().min(1).max(100000),
  targetId: z.number().int().positive(),
  metadata: z.object({
    timestamp: z.number(),
    source: z.string(),
    verified: z.boolean(),
  }),
})

const nestedSchema = z.object({
  player: z.object({
    id: z.number(),
    name: z.string(),
    account: z.object({
      id: z.string(),
      balance: z.number(),
      transactions: z.array(
        z.object({
          id: z.number(),
          amount: z.number(),
          type: z.enum(['deposit', 'withdrawal']),
        }),
      ),
    }),
  }),
  action: z.string(),
  target: z.object({
    id: z.number(),
    name: z.string(),
  }),
})

const tupleSchema = z.tuple([z.coerce.number().positive(), z.coerce.number().min(1).max(50000)])

const simpleData = {
  name: 'TestPlayer',
  age: 25,
  email: 'test@example.com',
}

const complexData = {
  playerId: 123,
  action: 'transfer' as const,
  amount: 5000,
  targetId: 456,
  metadata: {
    timestamp: Date.now(),
    source: 'bank',
    verified: true,
  },
}

const nestedData = {
  player: {
    id: 123,
    name: 'TestPlayer',
    account: {
      id: 'acc-123',
      balance: 10000,
      transactions: [
        { id: 1, amount: 100, type: 'deposit' as const },
        { id: 2, amount: 50, type: 'withdrawal' as const },
      ],
    },
  },
  action: 'transfer',
  target: {
    id: 456,
    name: 'TargetPlayer',
  },
}

const tupleData = ['123', '5000']

export async function runValidationBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  bench.add('Zod - Simple schema validation', async () => {
    simpleSchema.parse(simpleData)
  })

  bench.add('Zod - Complex schema validation', async () => {
    complexSchema.parse(complexData)
  })

  bench.add('Zod - Nested schema validation', async () => {
    nestedSchema.parse(nestedData)
  })

  bench.add('Zod - Tuple schema with coercion', async () => {
    tupleSchema.parse(tupleData)
  })

  bench.add('Zod - 100 simple validations', async () => {
    for (let i = 0; i < 100; i++) {
      simpleSchema.parse(simpleData)
    }
  })

  bench.add('Zod - 100 complex validations', async () => {
    for (let i = 0; i < 100; i++) {
      complexSchema.parse(complexData)
    }
  })

  bench.add('Zod - Safe parse (no throw)', async () => {
    simpleSchema.safeParse(simpleData)
  })

  return bench
}
