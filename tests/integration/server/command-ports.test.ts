import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IEngineEvents } from '../../../src/adapters/contracts/IEngineEvents'
import type { CommandErrorObserverContract } from '../../../src/runtime/server/contracts/command-error-observer.contract'
import { CommandExportController } from '../../../src/runtime/server/controllers/command-export.controller'
import type { CommandMetadata } from '../../../src/runtime/server/decorators/command'
import { Player } from '../../../src/runtime/server/entities/player'
import { CommandService } from '../../../src/runtime/server/services/core/command.service'
import type { CommandExecutionPort } from '../../../src/runtime/server/services/ports/command-execution.port'
import type { PlayerDirectoryPort } from '../../../src/runtime/server/services/ports/player-directory.port'
import { createMockPlayerAdapters } from '../../helpers'

// Mock getRuntimeContext
vi.mock('../../../src/runtime/server/runtime', () => ({
  getRuntimeContext: vi.fn(() => ({
    coreResourceName: 'opencore',
    mode: 'RESOURCE',
  })),
}))

describe('Command Ports Integration', () => {
  describe('CORE Mode - Local command execution', () => {
    let commandService: CommandService
    let playerDirectory: PlayerDirectoryPort
    let exportController: CommandExportController
    let mockEngineEvents: IEngineEvents
    let mockCommandErrorObserver: CommandErrorObserverContract

    beforeEach(() => {
      commandService = new CommandService()

      playerDirectory = {
        getByClient: vi.fn((clientID) => {
          return new Player(
            { clientID, accountID: 'test-account', meta: {} },
            createMockPlayerAdapters(),
          )
        }),
        getAll: vi.fn(() => []),
      } as any

      // Mock security services
      const mockAccessControl = {
        enforce: vi.fn().mockResolvedValue(undefined),
      } as any

      const mockRateLimiter = {
        checkLimit: vi.fn().mockReturnValue(true),
      } as any

      // Mock engine events adapter
      mockEngineEvents = {
        on: vi.fn(),
        emit: vi.fn(),
      } as any

      mockCommandErrorObserver = {
        onError: vi.fn(),
      } as any

      exportController = new CommandExportController(
        commandService,
        playerDirectory,
        mockAccessControl,
        mockRateLimiter,
        mockCommandErrorObserver,
        mockEngineEvents,
      )

      vi.clearAllMocks()
    })

    it('should execute local command directly', async () => {
      const handler = vi.fn().mockResolvedValue('success')

      const meta: CommandMetadata = {
        command: 'heal',
        methodName: 'heal',
        target: class {} as any,
        paramTypes: [Player],
        paramNames: ['player'],
        expectsPlayer: true,
        isPublic: true,
      }

      commandService.register(meta, handler)

      await exportController.executeCommand(1, 'heal', [])

      expect(handler).toHaveBeenCalled()
      expect(mockEngineEvents.emit).not.toHaveBeenCalled()
    })

    it('should delegate remote command to resource', async () => {
      const remoteDto = {
        command: 'remote-heal',
        isPublic: false,
        resourceName: 'medical-resource',
      }

      exportController.registerCommand(remoteDto)

      await exportController.executeCommand(1, 'remote-heal', ['arg'])

      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        'opencore:command:execute:medical-resource',
        1,
        'remote-heal',
        ['arg'],
      )
    })

    it('should list both local and remote commands', () => {
      const localHandler = vi.fn()
      const localMeta: CommandMetadata = {
        command: 'local-cmd',
        methodName: 'localCmd',
        target: class {} as any,
        paramTypes: [Player],
        paramNames: ['player'],
        expectsPlayer: true,
        description: 'Local command',
        isPublic: true,
      }

      commandService.register(localMeta, localHandler)

      const remoteDto = {
        command: 'remote-cmd',
        description: 'Remote command',
        isPublic: false,
        resourceName: 'remote-resource',
      }

      exportController.registerCommand(remoteDto)

      const allCommands = exportController.getAllCommands()

      expect(allCommands).toHaveLength(2)
      expect(allCommands.map((c) => c.command)).toContain('local-cmd')
      expect(allCommands.map((c) => c.command)).toContain('remote-cmd')
    })

    it('should handle multiple resources registering different commands', async () => {
      exportController.registerCommand({
        command: 'police-arrest',
        isPublic: false,
        resourceName: 'police-resource',
      })

      exportController.registerCommand({
        command: 'medical-revive',
        isPublic: false,
        resourceName: 'medical-resource',
      })

      // Execute police command
      await exportController.executeCommand(1, 'police-arrest', [])
      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        'opencore:command:execute:police-resource',
        expect.any(Number),
        'police-arrest',
        expect.any(Array),
      )

      vi.clearAllMocks()

      // Execute medical command
      await exportController.executeCommand(1, 'medical-revive', [])
      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        'opencore:command:execute:medical-resource',
        expect.any(Number),
        'medical-revive',
        expect.any(Array),
      )
    })
  })

  // RESOURCE Mode tests are covered by unit tests in remote-command.service.test.ts
  // Integration tests focus on CORE mode and command routing

  describe('CORE routing to RESOURCE', () => {
    it('should register remote command and emit event when executed', async () => {
      // Setup CORE side
      const coreCommandService = new CommandService()
      const corePlayerDirectory: PlayerDirectoryPort = {
        getByClient: vi.fn((clientID) => {
          return new Player(
            { clientID, accountID: 'test-account', meta: {} },
            createMockPlayerAdapters(),
          )
        }),
        getAll: vi.fn(() => []),
      } as any

      // Mock security services
      const mockAccessControl = {
        enforce: vi.fn().mockResolvedValue(undefined),
      } as any

      const mockRateLimiter = {
        checkLimit: vi.fn().mockReturnValue(true),
      } as any

      // Mock engine events adapter
      const mockEngineEvents: IEngineEvents = {
        on: vi.fn(),
        emit: vi.fn(),
      } as any

      const coreExportController = new CommandExportController(
        coreCommandService,
        corePlayerDirectory,
        mockAccessControl,
        mockRateLimiter,
        { onError: vi.fn() } as any,
        mockEngineEvents,
      )

      // RESOURCE registers a command via export
      coreExportController.registerCommand({
        command: 'resource-cmd',
        description: 'Resource command',
        isPublic: false,
        resourceName: 'test-resource',
      })

      // Verify command was registered
      const allCommands = coreExportController.getAllCommands()
      expect(allCommands.find((c) => c.command === 'resource-cmd')).toBeDefined()

      // Simulate player executing command (CORE delegates to RESOURCE)
      await coreExportController.executeCommand(1, 'resource-cmd', ['arg1'])

      // Verify CORE emitted local event to resource (not network event)
      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        'opencore:command:execute:test-resource',
        1,
        'resource-cmd',
        ['arg1'],
      )
    })
  })

  describe('Port abstraction benefits', () => {
    it('should allow swapping implementations without changing consumers', () => {
      // This test demonstrates the power of the port pattern
      const mockPort: CommandExecutionPort = {
        register: vi.fn(),
        execute: vi.fn(),
        getAllCommands: vi.fn(() => []),
        getCommandMeta: vi.fn(() => undefined),
      }

      // Consumer code doesn't know if it's local or remote
      const consumer = (port: CommandExecutionPort) => {
        const meta: CommandMetadata = {
          command: 'test',
          methodName: 'test',
          target: class {} as any,
          paramTypes: [Player],
          paramNames: ['player'],
          expectsPlayer: true,
          isPublic: false,
        }
        port.register(meta, vi.fn())
      }

      // Works with mock
      consumer(mockPort)
      expect(mockPort.register).toHaveBeenCalled()

      // Works with local implementation
      const localService = new CommandService()
      consumer(localService)

      // Verify both were called
      expect(mockPort.register).toHaveBeenCalled()
    })
  })

  describe('RESOURCE → CORE security validation', () => {
    let coreCommandService: CommandService
    let corePlayerDirectory: PlayerDirectoryPort
    let coreExportController: any
    let mockAccessControl: any
    let mockRateLimiter: any
    let mockEngineEvents: IEngineEvents

    beforeEach(() => {
      coreCommandService = new CommandService()
      corePlayerDirectory = {
        getByClient: vi.fn((clientID) => {
          const player = new Player(
            { clientID, accountID: 'test-account', meta: {} },
            createMockPlayerAdapters(),
          )
          player.hasState = vi.fn().mockReturnValue(false)
          return player
        }),
        getAll: vi.fn(() => []),
      } as any

      // Mock security services
      mockAccessControl = {
        enforce: vi.fn().mockResolvedValue(undefined),
      }

      mockRateLimiter = {
        checkLimit: vi.fn().mockReturnValue(true),
      }

      // Mock engine events adapter
      mockEngineEvents = {
        on: vi.fn(),
        emit: vi.fn(),
      } as any

      // Create controller with security services
      coreExportController = new CommandExportController(
        coreCommandService,
        corePlayerDirectory,
        mockAccessControl,
        mockRateLimiter,
        { onError: vi.fn() } as any,
        mockEngineEvents,
      )

      vi.clearAllMocks()
    })

    it('should enforce @Guard for remote commands', async () => {
      // Register remote command with @Guard
      coreExportController.registerCommand({
        command: 'admin-heal',
        isPublic: false,
        resourceName: 'medical-resource',
        security: {
          guard: { rank: 5 },
        },
      })

      // Mock guard rejection
      mockAccessControl.enforce.mockRejectedValue(new Error('Insufficient rank'))

      // Execute should fail
      await expect(coreExportController.executeCommand(1, 'admin-heal', [])).rejects.toThrow(
        'Insufficient rank',
      )

      // Guard was called
      expect(mockAccessControl.enforce).toHaveBeenCalled()

      // Should NOT delegate to resource
      expect(mockEngineEvents.emit).not.toHaveBeenCalled()
    })

    it('should enforce @Throttle for remote commands', async () => {
      // Register remote command with @Throttle
      coreExportController.registerCommand({
        command: 'search',
        isPublic: false,
        resourceName: 'inventory-resource',
        security: {
          throttle: { limit: 2, windowMs: 1000 },
        },
      })

      // First 2 executions should succeed
      await coreExportController.executeCommand(1, 'search', ['item'])
      await coreExportController.executeCommand(1, 'search', ['item'])

      // Mock rate limit exceeded for 3rd
      mockRateLimiter.checkLimit.mockReturnValue(false)

      // 3rd execution should fail
      await expect(coreExportController.executeCommand(1, 'search', ['item'])).rejects.toThrow(
        /rate limit exceeded/i,
      )

      // Rate limiter was called
      expect(mockRateLimiter.checkLimit).toHaveBeenCalled()
    })

    it('should enforce @RequiresState for remote commands', async () => {
      // Setup player with 'dead' state
      const deadPlayer = new Player(
        { clientID: 1, accountID: 'test-account', meta: {} },
        createMockPlayerAdapters(),
      )
      deadPlayer.hasState = vi.fn((state: string) => state === 'dead')
      ;(corePlayerDirectory.getByClient as any).mockReturnValue(deadPlayer)

      // Register remote command with @RequiresState
      coreExportController.registerCommand({
        command: 'use-item',
        isPublic: false,
        resourceName: 'inventory-resource',
        security: {
          requiresState: { missing: ['dead'] },
        },
      })

      // Execute should fail (player is dead)
      await expect(coreExportController.executeCommand(1, 'use-item', [])).rejects.toThrow(
        /cannot be used in state/i,
      )

      // State was checked
      expect(deadPlayer.hasState).toHaveBeenCalledWith('dead')

      // Should NOT delegate to resource
      expect(mockEngineEvents.emit).not.toHaveBeenCalled()
    })

    it('should allow execution after passing all validations', async () => {
      // Setup player with 'on_duty' state
      const onDutyPlayer = new Player(
        { clientID: 1, accountID: 'test-account', meta: {} },
        createMockPlayerAdapters(),
      )
      onDutyPlayer.hasState = vi.fn((state: string) => state === 'on_duty')
      ;(corePlayerDirectory.getByClient as any).mockReturnValue(onDutyPlayer)

      // Register remote command with all security decorators
      coreExportController.registerCommand({
        command: 'arrest',
        isPublic: false,
        resourceName: 'police-resource',
        security: {
          guard: { rank: 3 },
          throttle: { limit: 5, windowMs: 1000 },
          requiresState: { has: ['on_duty'] },
        },
      })

      // Execute should succeed
      await coreExportController.executeCommand(1, 'arrest', ['player123'])

      // All validations should pass
      expect(mockAccessControl.enforce).toHaveBeenCalled()
      expect(mockRateLimiter.checkLimit).toHaveBeenCalled()
      expect(onDutyPlayer.hasState).toHaveBeenCalledWith('on_duty')

      // Should delegate to resource via local event
      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        'opencore:command:execute:police-resource',
        1,
        'arrest',
        ['player123'],
      )
    })
  })
})
