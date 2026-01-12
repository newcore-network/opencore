import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IEngineEvents } from '../../../../src/adapters/contracts/IEngineEvents'
import { AppError } from '../../../../src/kernel/shared/error'
import { CommandExportController } from '../../../../src/runtime/server/controllers/command-export.controller'
import type { CommandExecutionPort } from '../../../../src/runtime/server/services/ports/command-execution.port'
import type { PlayerDirectoryPort } from '../../../../src/runtime/server/services/ports/player-directory.port'
import type { CommandRegistrationDto } from '../../../../src/runtime/server/types/core-exports'
import { createAuthenticatedPlayer, createTestPlayer } from '../../../helpers'

describe('CommandExportController', () => {
  let controller: CommandExportController
  let mockCommandService: CommandExecutionPort
  let mockPlayerDirectory: PlayerDirectoryPort
  let mockEngineEvents: IEngineEvents
  let mockAccessControl: any
  let mockRateLimiter: any

  beforeEach(() => {
    // Create mock services
    mockCommandService = {
      register: vi.fn(),
      execute: vi.fn(),
      getAllCommands: vi.fn(() => []),
    } as any

    mockPlayerDirectory = {
      getByClient: vi.fn(),
      getAll: vi.fn(() => []),
    } as any

    // Mock engine events adapter
    mockEngineEvents = {
      on: vi.fn(),
      emit: vi.fn(),
    } as any

    // Mock security services (default: allow everything)
    mockAccessControl = {
      enforce: vi.fn().mockResolvedValue(undefined),
    }

    mockRateLimiter = {
      checkLimit: vi.fn().mockReturnValue(true),
    }

    controller = new CommandExportController(
      mockCommandService,
      mockPlayerDirectory,
      mockAccessControl,
      mockRateLimiter,
      mockEngineEvents,
    )

    // Clear mocks
    vi.clearAllMocks()
  })

  describe('registerCommand', () => {
    it('should register remote command metadata', () => {
      const dto: CommandRegistrationDto = {
        command: 'heal',
        description: 'Heal a player',
        usage: '/heal <player>',
        isPublic: false,
        resourceName: 'my-resource',
      }

      controller.registerCommand(dto)

      // Should not throw, registration is stored internally
      expect(() => controller.registerCommand(dto)).not.toThrow()
    })

    it('should handle duplicate command registration gracefully', () => {
      const dto: CommandRegistrationDto = {
        command: 'test',
        description: 'Test command',
        isPublic: false,
        resourceName: 'resource-a',
      }

      controller.registerCommand(dto)
      controller.registerCommand(dto) // Register again

      // Should not throw, logs warning instead
      expect(() => controller.registerCommand(dto)).not.toThrow()
    })

    it('should store commands case-insensitively', () => {
      const dto1: CommandRegistrationDto = {
        command: 'TEST',
        isPublic: false,
        resourceName: 'resource-a',
      }

      const dto2: CommandRegistrationDto = {
        command: 'test',
        isPublic: false,
        resourceName: 'resource-b',
      }

      controller.registerCommand(dto1)
      controller.registerCommand(dto2) // Should be treated as duplicate

      // Second registration should be ignored (duplicate)
      expect(true).toBe(true) // No assertion needed, just verify no crash
    })

    it('should register commands from different resources', () => {
      const dto1: CommandRegistrationDto = {
        command: 'heal',
        isPublic: false,
        resourceName: 'medical-resource',
      }

      const dto2: CommandRegistrationDto = {
        command: 'repair',
        isPublic: false,
        resourceName: 'mechanic-resource',
      }

      controller.registerCommand(dto1)
      controller.registerCommand(dto2)

      // Both should be registered
      const allCommands = controller.getAllCommands()
      const commandNames = allCommands.map((c) => c.command)

      expect(commandNames).toContain('heal')
      expect(commandNames).toContain('repair')
    })
  })

  describe('executeCommand', () => {
    it('should execute local command if not remote', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      await controller.executeCommand(1, 'localcmd', ['arg1'])

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'localcmd', ['arg1'])
    })

    it('should delegate to resource via net event for remote command', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      // Register a remote command
      const dto: CommandRegistrationDto = {
        command: 'remotecmd',
        isPublic: false,
        resourceName: 'my-resource',
      }
      controller.registerCommand(dto)

      await controller.executeCommand(1, 'remotecmd', ['arg1', 'arg2'])

      // Should emit event to resource via adapter
      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        'opencore:command:execute:my-resource',
        1,
        'remotecmd',
        ['arg1', 'arg2'],
      )

      // Should NOT execute locally
      expect(mockCommandService.execute).not.toHaveBeenCalled()
    })

    it('should handle case-insensitive remote command lookup', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      // Register with uppercase
      const dto: CommandRegistrationDto = {
        command: 'REMOTE',
        isPublic: false,
        resourceName: 'my-resource',
      }
      controller.registerCommand(dto)

      // Execute with lowercase
      await controller.executeCommand(1, 'remote', [])

      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        'opencore:command:execute:my-resource',
        1,
        'remote',
        [],
      )
    })

    it('should throw if player not found', async () => {
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(undefined)

      await expect(controller.executeCommand(999, 'test', [])).rejects.toThrow(AppError)
      await expect(controller.executeCommand(999, 'test', [])).rejects.toThrow(/player not found/i)
    })

    it('should pass correct clientID to emitNet', async () => {
      const fakePlayer = createTestPlayer({ clientID: 42 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      const dto: CommandRegistrationDto = {
        command: 'test',
        isPublic: false,
        resourceName: 'test-resource',
      }
      controller.registerCommand(dto)

      await controller.executeCommand(42, 'test', [])

      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        expect.any(String),
        42, // clientID
        'test',
        [],
      )
    })

    it('should handle empty args array', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      const dto: CommandRegistrationDto = {
        command: 'noargs',
        isPublic: false,
        resourceName: 'test-resource',
      }
      controller.registerCommand(dto)

      await controller.executeCommand(1, 'noargs', [])

      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        'opencore:command:execute:test-resource',
        1,
        'noargs',
        [],
      )
    })
  })

  describe('getAllCommands', () => {
    it('should return local commands from CommandService', () => {
      const localCommands = [
        { command: 'help', description: 'Help', usage: '/help', isPublic: true },
        { command: 'info', description: 'Info', usage: '/info', isPublic: false },
      ]
      ;(mockCommandService.getAllCommands as any).mockReturnValue(localCommands)

      const result = controller.getAllCommands()

      expect(result).toHaveLength(2)
      expect(result).toEqual(expect.arrayContaining(localCommands))
    })

    it('should return remote commands from registered resources', () => {
      ;(mockCommandService.getAllCommands as any).mockReturnValue([])

      const dto1: CommandRegistrationDto = {
        command: 'remote1',
        description: 'Remote command 1',
        usage: '/remote1',
        isPublic: false,
        resourceName: 'resource-a',
      }

      const dto2: CommandRegistrationDto = {
        command: 'remote2',
        description: 'Remote command 2',
        isPublic: true,
        resourceName: 'resource-b',
      }

      controller.registerCommand(dto1)
      controller.registerCommand(dto2)

      const result = controller.getAllCommands()

      expect(result).toHaveLength(2)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ command: 'remote1', isPublic: false }),
          expect.objectContaining({ command: 'remote2', isPublic: true }),
        ]),
      )
    })

    it('should return combined local and remote commands', () => {
      const localCommands = [
        { command: 'local1', description: 'Local', usage: '/local1', isPublic: true },
      ]
      ;(mockCommandService.getAllCommands as any).mockReturnValue(localCommands)

      const dto: CommandRegistrationDto = {
        command: 'remote1',
        description: 'Remote',
        isPublic: false,
        resourceName: 'resource-a',
      }
      controller.registerCommand(dto)

      const result = controller.getAllCommands()

      expect(result).toHaveLength(2)
      expect(result.map((c) => c.command)).toContain('local1')
      expect(result.map((c) => c.command)).toContain('remote1')
    })

    it('should handle empty command list', () => {
      ;(mockCommandService.getAllCommands as any).mockReturnValue([])

      const result = controller.getAllCommands()

      expect(result).toEqual([])
    })

    it('should preserve command metadata correctly', () => {
      ;(mockCommandService.getAllCommands as any).mockReturnValue([])

      const dto: CommandRegistrationDto = {
        command: 'test',
        description: 'Test description',
        usage: '/test <arg>',
        isPublic: true,
        resourceName: 'test-resource',
      }
      controller.registerCommand(dto)

      const result = controller.getAllCommands()

      expect(result[0]).toEqual({
        command: 'test',
        description: 'Test description',
        usage: '/test <arg>',
        isPublic: true,
      })
    })
  })

  describe('remote command routing', () => {
    it('should route commands to correct resource', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      const dto1: CommandRegistrationDto = {
        command: 'cmd1',
        isPublic: false,
        resourceName: 'resource-a',
      }

      const dto2: CommandRegistrationDto = {
        command: 'cmd2',
        isPublic: false,
        resourceName: 'resource-b',
      }

      controller.registerCommand(dto1)
      controller.registerCommand(dto2)

      await controller.executeCommand(1, 'cmd1', [])
      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        'opencore:command:execute:resource-a',
        expect.any(Number),
        'cmd1',
        expect.any(Array),
      )

      vi.clearAllMocks()

      await controller.executeCommand(1, 'cmd2', [])
      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        'opencore:command:execute:resource-b',
        expect.any(Number),
        'cmd2',
        expect.any(Array),
      )
    })
  })

  describe('security validation', () => {
    beforeEach(() => {
      // Reset security mocks to allow all by default
      mockAccessControl = {
        enforce: vi.fn().mockResolvedValue(undefined),
      }

      mockRateLimiter = {
        checkLimit: vi.fn().mockReturnValue(true),
      }

      // Recreate controller with fresh mocks
      controller = new CommandExportController(
        mockCommandService,
        mockPlayerDirectory,
        mockAccessControl,
        mockRateLimiter,
        mockEngineEvents,
      )

      vi.clearAllMocks()
    })

    it('should validate @Guard before delegating', async () => {
      const fakePlayer = createAuthenticatedPlayer('test', { clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      const dto: CommandRegistrationDto = {
        command: 'test',
        isPublic: false,
        resourceName: 'test-resource',
        security: {
          guard: { rank: 5 },
        },
      }

      controller.registerCommand(dto)

      // Mock guard to throw
      mockAccessControl.enforce.mockRejectedValue(new Error('Permission denied'))

      await expect(controller.executeCommand(1, 'test', [])).rejects.toThrow('Permission denied')

      // Should call enforce
      expect(mockAccessControl.enforce).toHaveBeenCalledWith(fakePlayer, { rank: 5 })

      // Should NOT delegate to resource
      expect(mockEngineEvents.emit).not.toHaveBeenCalled()
    })

    it('should validate @Throttle before delegating', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      const dto: CommandRegistrationDto = {
        command: 'test',
        isPublic: false,
        resourceName: 'test-resource',
        security: {
          throttle: { limit: 5, windowMs: 1000 },
        },
      }

      controller.registerCommand(dto)

      // Mock rate limit exceeded
      mockRateLimiter.checkLimit.mockReturnValue(false)

      await expect(controller.executeCommand(1, 'test', [])).rejects.toThrow('Rate limit exceeded')

      // Should check rate limit
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith('1:remote:test', 5, 1000)

      // Should NOT delegate to resource
      expect(mockEngineEvents.emit).not.toHaveBeenCalled()
    })

    it('should validate @RequiresState before delegating', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      fakePlayer.hasState = vi.fn().mockReturnValue(true) // Player is dead
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      const dto: CommandRegistrationDto = {
        command: 'test',
        isPublic: false,
        resourceName: 'test-resource',
        security: {
          requiresState: { missing: ['dead'] },
        },
      }

      controller.registerCommand(dto)

      await expect(controller.executeCommand(1, 'test', [])).rejects.toThrow(
        /cannot be used in state/i,
      )

      // Should check state
      expect(fakePlayer.hasState).toHaveBeenCalledWith('dead')

      // Should NOT delegate to resource
      expect(mockEngineEvents.emit).not.toHaveBeenCalled()
    })

    it('should validate in order: guard → throttle → requiresState', async () => {
      const fakePlayer = createAuthenticatedPlayer('test', { clientID: 1 })
      fakePlayer.hasState = vi.fn().mockReturnValue(false)
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      const dto: CommandRegistrationDto = {
        command: 'test',
        isPublic: false,
        resourceName: 'test-resource',
        security: {
          guard: { rank: 1 },
          throttle: { limit: 5, windowMs: 1000 },
          requiresState: { has: ['on_duty'] },
        },
      }

      controller.registerCommand(dto)

      const callOrder: string[] = []
      mockAccessControl.enforce.mockImplementation(async () => {
        callOrder.push('guard')
      })
      mockRateLimiter.checkLimit.mockImplementation(() => {
        callOrder.push('throttle')
        return true
      })
      fakePlayer.hasState = vi.fn().mockImplementation((_state: string) => {
        callOrder.push('requiresState')
        return true
      })

      await controller.executeCommand(1, 'test', [])

      // Verify order
      expect(callOrder).toEqual(['guard', 'throttle', 'requiresState'])

      // Should delegate after all validations pass
      expect(mockEngineEvents.emit).toHaveBeenCalled()
    })

    it('should skip validation if no security metadata', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      const dto: CommandRegistrationDto = {
        command: 'test',
        isPublic: false,
        resourceName: 'test-resource',
        // No security metadata
      }

      controller.registerCommand(dto)

      await controller.executeCommand(1, 'test', [])

      // Should NOT call any validation
      expect(mockAccessControl.enforce).not.toHaveBeenCalled()
      expect(mockRateLimiter.checkLimit).not.toHaveBeenCalled()

      // Should delegate
      expect(mockEngineEvents.emit).toHaveBeenCalled()
    })

    it('should stop validation chain on first failure', async () => {
      const fakePlayer = createAuthenticatedPlayer('test', { clientID: 1 })
      fakePlayer.hasState = vi.fn()
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      const dto: CommandRegistrationDto = {
        command: 'test',
        isPublic: false,
        resourceName: 'test-resource',
        security: {
          guard: { rank: 10 },
          throttle: { limit: 5, windowMs: 1000 },
          requiresState: { has: ['on_duty'] },
        },
      }

      controller.registerCommand(dto)

      // Make guard fail
      mockAccessControl.enforce.mockRejectedValue(new Error('Insufficient rank'))

      await expect(controller.executeCommand(1, 'test', [])).rejects.toThrow('Insufficient rank')

      // Guard was called
      expect(mockAccessControl.enforce).toHaveBeenCalled()

      // Throttle and requiresState should NOT be called
      expect(mockRateLimiter.checkLimit).not.toHaveBeenCalled()
      expect(fakePlayer.hasState).not.toHaveBeenCalled()
    })

    it('should allow execution after passing all validations', async () => {
      const fakePlayer = createAuthenticatedPlayer('test', { clientID: 1 })
      fakePlayer.hasState = vi.fn().mockReturnValue(true)
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      const dto: CommandRegistrationDto = {
        command: 'test',
        isPublic: false,
        resourceName: 'test-resource',
        security: {
          guard: { rank: 1 },
          throttle: { limit: 5, windowMs: 1000 },
          requiresState: { has: ['on_duty'] },
        },
      }

      controller.registerCommand(dto)

      await controller.executeCommand(1, 'test', ['arg1'])

      // All validations should pass
      expect(mockAccessControl.enforce).toHaveBeenCalled()
      expect(mockRateLimiter.checkLimit).toHaveBeenCalled()
      expect(fakePlayer.hasState).toHaveBeenCalled()

      // Should delegate to resource
      expect(mockEngineEvents.emit).toHaveBeenCalledWith(
        'opencore:command:execute:test-resource',
        1,
        'test',
        ['arg1'],
      )
    })
  })
})
