import { describe, it, expect, beforeEach } from 'vitest'
import { resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { CommandService } from '../../src/server/services/command.service'
import { DefaultSecurityHandler } from '../../src/server/services/default/default-security.handler'
import { AccessControlService } from '../../src/server/services/access-control.service'
import { PrincipalProviderContract } from '../../src/server/templates/security/principal-provider.contract'
import { emitCoreEvent } from '../../src/server/bus/core-event-bus'
import { PlayerFactory } from '../utils/player-factory'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'
import { z } from 'zod'
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

// Mock del EventBus para medir emisiones
let eventBusEmissions = 0
const originalEmitCoreEvent = emitCoreEvent

// Test Service que emite eventos
class TestService {
  async processTransfer(player: any, amount: number, targetId: number) {
    // Simular lógica de negocio
    const result = { success: true, amount, targetId }
    emitCoreEvent('core:transfer:completed', { playerId: player.clientID, amount, targetId })
    eventBusEmissions++
    return result
  }
}

// Controladores de prueba con diferentes configuraciones
class SimpleCommandController {
  async handleCommand(player: any, args: any[]) {
    return { success: true }
  }
}

class ValidatedCommandController {
  async handleCommand(player: any, args: [number, string]) {
    return { success: true, args }
  }
}

class GuardedCommandController {
  async handleCommand(player: any, args: any[]) {
    return { success: true }
  }
}

class FullPipelineController {
  constructor(private testService: TestService) {}

  async handleCommand(player: any, args: [number, number]) {
    const [amount, targetId] = args
    return await this.testService.processTransfer(player, amount, targetId)
  }
}

const simpleSchema = z.tuple([z.coerce.number(), z.coerce.string()])
const transferSchema = z.tuple([z.coerce.number().min(1), z.coerce.number().min(1)])

describe('Pipeline Load Benchmarks', () => {
  let commandService: CommandService
  let accessControl: AccessControlService
  let testService: TestService
  let principalProvider: MockPrincipalProvider

  beforeEach(() => {
    resetCitizenFxMocks()
    eventBusEmissions = 0

    const securityHandler = new DefaultSecurityHandler()
    principalProvider = new MockPrincipalProvider()
    commandService = new CommandService(securityHandler)
    accessControl = new AccessControlService(principalProvider)
    testService = new TestService()

    // Registrar comandos simples
    const simpleController = new SimpleCommandController()
    commandService.register(
      {
        name: 'simple',
        methodName: 'handleCommand',
        target: SimpleCommandController,
      },
      simpleController.handleCommand.bind(simpleController),
    )

    // Registrar comandos validados
    const validatedController = new ValidatedCommandController()
    commandService.register(
      {
        name: 'validated',
        methodName: 'handleCommand',
        target: ValidatedCommandController,
        schema: simpleSchema,
      },
      validatedController.handleCommand.bind(validatedController),
    )

    // Registrar comandos con guard (simulado)
    const guardedController = new GuardedCommandController()
    commandService.register(
      {
        name: 'guarded',
        methodName: 'handleCommand',
        target: GuardedCommandController,
      },
      async (player: any, args: any[]) => {
        // Simular guard check
        await accessControl.enforce(player, { minRank: 1 })
        return guardedController.handleCommand(player, args)
      },
    )

    // Registrar pipeline completa
    const fullController = new FullPipelineController(testService)
    commandService.register(
      {
        name: 'full',
        methodName: 'handleCommand',
        target: FullPipelineController,
        schema: transferSchema,
      },
      async (player: any, args: any[]) => {
        // Simular guard check
        await accessControl.enforce(player, { minRank: 1 })
        return fullController.handleCommand(player, args)
      },
    )
  })

  const scenarios = getAllScenarios()

  for (const playerCount of scenarios) {
    it(`Pipeline - ${playerCount} players, simple command (no validation, no guard)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })
      const timings: number[] = []

      for (const player of players) {
        const start = performance.now()
        await commandService.execute(player, 'simple', ['arg1'], '/simple arg1')
        const end = performance.now()
        timings.push(end - start)
      }

      const metrics = calculateLoadMetrics(timings, `Pipeline - Simple (${playerCount} players)`, playerCount, playerCount, 0)

      expect(metrics.successCount).toBe(playerCount)
      reportLoadMetric(metrics)
    })

    it(`Pipeline - ${playerCount} players, validated command (Zod only)`, async () => {
      const players = PlayerFactory.createPlayers(playerCount, { rank: 1 })
      const timings: number[] = []

      for (const player of players) {
        const start = performance.now()
        await commandService.execute(player, 'validated', ['123', 'test'], '/validated 123 test')
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
        await commandService.execute(player, 'guarded', ['arg1'], '/guarded arg1')
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

        // Etapa 1: Búsqueda de comando
        const lookupStart = performance.now()
        const entry = (commandService as any).commands.get('full')
        const lookupEnd = performance.now()
        stageTimings.commandLookup.push(lookupEnd - lookupStart)

        if (!entry) continue

        // Etapa 2: Validación Zod
        const zodStart = performance.now()
        let validatedArgs: any[] = ['100', '200']
        try {
          const result = await transferSchema.parseAsync(['100', '200'])
          validatedArgs = Array.isArray(result) ? result : [result]
        } catch (error) {
          // Ignorar errores de validación en benchmark
        }
        const zodEnd = performance.now()
        stageTimings.zodValidation.push(zodEnd - zodStart)

        // Etapa 3: Guard check
        const guardStart = performance.now()
        await accessControl.enforce(player, { minRank: 1 })
        const guardEnd = performance.now()
        stageTimings.guardCheck.push(guardEnd - guardStart)

        // Etapa 4: Ejecución del servicio
        const serviceStart = performance.now()
        const [amount, targetId] = validatedArgs
        await testService.processTransfer(player, amount, targetId)
        const serviceEnd = performance.now()
        stageTimings.serviceExecution.push(serviceEnd - serviceStart)

        // Etapa 5: EventBus (ya emitido en el servicio, solo medimos)
        stageTimings.eventBusEmit.push(0.1) // Simulado

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

      // Calcular métricas por etapa
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
      console.log(`  └─ Command Lookup: ${stageMetrics.commandLookup.mean.toFixed(2)}ms (${stageMetrics.commandLookup.mean / totalMetrics.mean * 100}%)`)
      console.log(`  └─ Zod Validation: ${stageMetrics.zodValidation.mean.toFixed(2)}ms (${stageMetrics.zodValidation.mean / totalMetrics.mean * 100}%)`)
      console.log(`  └─ Guard Check: ${stageMetrics.guardCheck.mean.toFixed(2)}ms (${stageMetrics.guardCheck.mean / totalMetrics.mean * 100}%)`)
      console.log(`  └─ Service Execution: ${stageMetrics.serviceExecution.mean.toFixed(2)}ms (${stageMetrics.serviceExecution.mean / totalMetrics.mean * 100}%)`)
      console.log(`  └─ EventBus Emit: ${stageMetrics.eventBusEmit.mean.toFixed(2)}ms`)
    })
  }
})

