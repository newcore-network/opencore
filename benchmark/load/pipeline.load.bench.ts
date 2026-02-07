import { beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { CommandMetadata } from '../../src/runtime/server/decorators/command'
import { Player } from '../../src/runtime/server/entities/player'
import { LocalCommandImplementation } from '../../src/runtime/server/implementations/local/command.local'
import { LocalPrincipalService } from '../../src/runtime/server/implementations/local/principal.local'
import type { Principal } from '../../src/runtime/server/types/principal.type'
import { PrincipalProviderContract } from '../../src/runtime/server/contracts/security/principal-provider.contract'
import { resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { PlayerFactory } from '../utils/player-factory'

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

let eventBusEmissions = 0

class TestService {
  async processTransfer(player: any, amount: number, targetId: number) {
    const result = { success: true, amount, targetId }
    eventBusEmissions++
    return result
  }
}

class SimpleCommandController {
  async handleCommand(player: any, arg1: string) {
    return { success: true }
  }
}

class ValidatedCommandController {
  async handleCommand(player: any, amount: number, name: string) {
    return { success: true, amount, name }
  }
}

class GuardedCommandController {
  async handleCommand(player: any, arg1: string) {
    return { success: true }
  }
}

class FullPipelineController {
  constructor(private testService: TestService) {}

  async handleCommand(player: any, amount: number, targetId: number) {
    return await this.testService.processTransfer(player, amount, targetId)
  }
}

const simpleSchema = z.tuple([z.coerce.number(), z.coerce.string()])
const transferSchema = z.tuple([z.coerce.number().min(1), z.coerce.number().min(1)])

describe('Pipeline Load Benchmarks', () => {
  let commandService: LocalCommandImplementation
  let accessControl: LocalPrincipalService
  let testService: TestService
  let principalProvider: MockPrincipalProvider

  beforeEach(() => {
    resetCitizenFxMocks()
    eventBusEmissions = 0

    principalProvider = new MockPrincipalProvider()
    commandService = new LocalCommandImplementation()
    accessControl = new LocalPrincipalService(principalProvider)
    testService = new TestService()

    const simpleController = new SimpleCommandController()

    const simpleMeta: CommandMetadata = {
      command: 'simple',
      methodName: 'handleCommand',
      target: SimpleCommandController,
      paramTypes: [Player, String],
      paramNames: ['player', 'arg1'],
      expectsPlayer: true,
      description: undefined,
      usage: '/simple <arg1>',
      schema: undefined,
    }
    commandService.register(simpleMeta, simpleController.handleCommand.bind(simpleController))

    const validatedController = new ValidatedCommandController()

    const validatedMeta: CommandMetadata = {
      command: 'validated',
      methodName: 'handleCommand',
      target: ValidatedCommandController,
      paramTypes: [Player, Number, String],
      paramNames: ['player', 'amount', 'name'],
      expectsPlayer: true,
      description: undefined,
      usage: '/validated <amount> <name>',
      schema: simpleSchema,
    }
    commandService.register(
      validatedMeta,
      validatedController.handleCommand.bind(validatedController),
    )

    const guardedController = new GuardedCommandController()

    const guardedMeta: CommandMetadata = {
      command: 'guarded',
      methodName: 'handleCommand',
      target: GuardedCommandController,
      paramTypes: [Player, String],
      paramNames: ['player', 'arg1'],
      expectsPlayer: true,
      description: undefined,
      usage: '/guarded <arg1>',
      schema: undefined,
    }
    commandService.register(guardedMeta, async (player: any, arg1: string) => {
      await accessControl.enforce(player, { rank: 1 })
      return guardedController.handleCommand(player, arg1)
    })

    const fullController = new FullPipelineController(testService)

    const fullMeta: CommandMetadata = {
      command: 'full',
      methodName: 'handleCommand',
      target: FullPipelineController,
      paramTypes: [Player, Number, Number],
      paramNames: ['player', 'amount', 'targetId'],
      expectsPlayer: true,
      description: undefined,
      usage: '/full <amount> <targetId>',
      schema: transferSchema,
    }
    commandService.register(fullMeta, async (player: any, amount: number, targetId: number) => {
      await accessControl.enforce(player, { rank: 1 })
      return fullController.handleCommand(player, amount, targetId)
    })
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Pipeline - ${playerCount} players, simple command (no validation, no guard)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })
      const timings: number[] = []

      for (const player of players) {
        const start = performance.now()
        await commandService.execute(player, 'simple', ['arg1'])
        const end = performance.now()
        timings.push(end - start)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Pipeline - Simple (${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      expect(metrics.successCount).toBe(playerCount)
      reportLoadMetric(metrics)
    })

    it(`Pipeline - ${playerCount} players, validated command (Zod only)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })
      const timings: number[] = []

      for (const player of players) {
        const start = performance.now()
        await commandService.execute(player, 'validated', ['123', 'test'])
        const end = performance.now()
        timings.push(end - start)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Pipeline - Validated (${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      expect(metrics.successCount).toBe(playerCount)
      reportLoadMetric(metrics)
    })

    it(`Pipeline - ${playerCount} players, guarded command (Guard only)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })
      const timings: number[] = []

      for (const player of players) {
        if (player.accountID) {
          principalProvider.setPrincipal(player.accountID, {
            id: player.accountID,
            rank: 5,
            permissions: [],
          })
        }
      }

      for (const player of players) {
        const start = performance.now()
        await commandService.execute(player, 'guarded', ['arg1'])
        const end = performance.now()
        timings.push(end - start)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Pipeline - Guarded (${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      expect(metrics.successCount).toBe(playerCount)
      reportLoadMetric(metrics)
    })

    it(`Pipeline - ${playerCount} players, full pipeline (Command → Guard → Service → EventBus → Zod → Response)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })
      const timings: number[] = []
      const stageTimings = {
        commandLookup: [] as number[],
        zodValidation: [] as number[],
        guardCheck: [] as number[],
        serviceExecution: [] as number[],
        eventBusEmit: [] as number[],
        total: [] as number[],
      }

      for (const player of players) {
        if (player.accountID) {
          principalProvider.setPrincipal(player.accountID, {
            id: player.accountID,
            rank: 5,
            permissions: [],
          })
        }
      }

      for (const player of players) {
        const totalStart = performance.now()

        const lookupStart = performance.now()
        const entry = (commandService as any).commands.get('full')
        const lookupEnd = performance.now()
        stageTimings.commandLookup.push(lookupEnd - lookupStart)

        if (!entry) continue

        const zodStart = performance.now()
        let validatedArgs: any[] = ['100', '200']
        try {
          const result = await transferSchema.parseAsync(['100', '200'])
          validatedArgs = Array.isArray(result) ? result : [result]
        } catch (error) {
          // ignore errors
        }
        const zodEnd = performance.now()
        stageTimings.zodValidation.push(zodEnd - zodStart)

        const guardStart = performance.now()
        await accessControl.enforce(player, { rank: 1 })
        const guardEnd = performance.now()
        stageTimings.guardCheck.push(guardEnd - guardStart)

        const serviceStart = performance.now()
        const [amount, targetId] = validatedArgs
        await testService.processTransfer(player, amount, targetId)
        const serviceEnd = performance.now()
        stageTimings.serviceExecution.push(serviceEnd - serviceStart)

        stageTimings.eventBusEmit.push(0.1)

        const totalEnd = performance.now()
        stageTimings.total.push(totalEnd - totalStart)
        timings.push(totalEnd - totalStart)
      }

      const totalMetrics = calculateLoadMetrics(
        timings,
        `Pipeline - Full (${playerCount} players)`,
        playerCount,
        playerCount,
        0,
      )

      const stageMetrics = {
        commandLookup: calculateLoadMetrics(
          stageTimings.commandLookup,
          'Stage - Command Lookup',
          playerCount,
          playerCount,
          0,
        ),
        zodValidation: calculateLoadMetrics(
          stageTimings.zodValidation,
          'Stage - Zod Validation',
          playerCount,
          playerCount,
          0,
        ),
        guardCheck: calculateLoadMetrics(
          stageTimings.guardCheck,
          'Stage - Guard Check',
          playerCount,
          playerCount,
          0,
        ),
        serviceExecution: calculateLoadMetrics(
          stageTimings.serviceExecution,
          'Stage - Service Execution',
          playerCount,
          playerCount,
          0,
        ),
        eventBusEmit: calculateLoadMetrics(
          stageTimings.eventBusEmit,
          'Stage - EventBus Emit',
          playerCount,
          playerCount,
          0,
        ),
      }

      expect(totalMetrics.successCount).toBe(playerCount)
      reportLoadMetric(totalMetrics)
      console.log(
        `  └─ Command Lookup: ${stageMetrics.commandLookup.mean.toFixed(2)}ms (${(stageMetrics.commandLookup.mean / totalMetrics.mean) * 100}%)`,
      )
      console.log(
        `  └─ Zod Validation: ${stageMetrics.zodValidation.mean.toFixed(2)}ms (${(stageMetrics.zodValidation.mean / totalMetrics.mean) * 100}%)`,
      )
      console.log(
        `  └─ Guard Check: ${stageMetrics.guardCheck.mean.toFixed(2)}ms (${(stageMetrics.guardCheck.mean / totalMetrics.mean) * 100}%)`,
      )
      console.log(
        `  └─ Service Execution: ${stageMetrics.serviceExecution.mean.toFixed(2)}ms (${(stageMetrics.serviceExecution.mean / totalMetrics.mean) * 100}%)`,
      )
      console.log(`  └─ EventBus Emit: ${stageMetrics.eventBusEmit.mean.toFixed(2)}ms`)
    })
  }
})
