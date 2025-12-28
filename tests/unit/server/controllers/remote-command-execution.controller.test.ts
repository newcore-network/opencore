import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RemoteCommandExecutionController } from '../../../../src/runtime/server/controllers/remote-command-execution.controller'
import { CommandExecutionPort } from '../../../../src/runtime/server/services/ports/command-execution.port'
import { PlayerDirectoryPort } from '../../../../src/runtime/server/services/ports/player-directory.port'
import { Player } from '../../../../src/runtime/server/entities/player'

// Mock GetCurrentResourceName
global.GetCurrentResourceName = vi.fn(() => 'test-resource')

describe('RemoteCommandExecutionController', () => {
  let controller: RemoteCommandExecutionController
  let mockCommandService: CommandExecutionPort
  let mockPlayerDirectory: PlayerDirectoryPort

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

    controller = new RemoteCommandExecutionController(mockCommandService, mockPlayerDirectory)

    // Clear mocks
    vi.clearAllMocks()
  })

  describe('handleCommandExecution', () => {
    it('should execute command with player and args', async () => {
      const fakePlayer = new Player(
        { clientID: 1, accountID: 'test-account', meta: {} } as any,
        {} as any,
      )
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      // Set global.source to simulate FiveM event source
      global.source = 1

      await controller.handleCommandExecution(fakePlayer, 'heal', ['self'])

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'heal', ['self'])
    })

    it('should handle command without arguments', async () => {
      const fakePlayer = new Player({ clientID: 1, meta: {} } as any, {} as any)
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      global.source = 1

      await controller.handleCommandExecution(fakePlayer, 'ping', [])

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'ping', [])
    })

    it('should handle command with multiple arguments', async () => {
      const fakePlayer = new Player({ clientID: 1, meta: {} } as any, {} as any)
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      global.source = 1

      await controller.handleCommandExecution(fakePlayer, 'teleport', ['100', '200', '300'])

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'teleport', [
        '100',
        '200',
        '300',
      ])
    })

    it('should not execute if player not found', async () => {
      // Player is null (not found in directory)
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(undefined)

      global.source = 1

      await controller.handleCommandExecution(null as any, 'test', [])

      // Should not call execute
      expect(mockCommandService.execute).not.toHaveBeenCalled()
    })

    it('should handle execution errors gracefully', async () => {
      const fakePlayer = new Player({ clientID: 1, meta: {} } as any, {} as any)
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      // Simulate error during execution
      const error = new Error('Command execution failed')
      ;(mockCommandService.execute as any).mockRejectedValue(error)

      global.source = 1

      // Should not throw, just log the error
      await expect(
        controller.handleCommandExecution(fakePlayer, 'failcmd', []),
      ).resolves.toBeUndefined()

      expect(mockCommandService.execute).toHaveBeenCalled()
    })

    it('should handle async command execution', async () => {
      const fakePlayer = new Player({ clientID: 1, meta: {} } as any, {} as any)
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      let executed = false
      ;(mockCommandService.execute as any).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        executed = true
      })

      global.source = 1

      await controller.handleCommandExecution(fakePlayer, 'asynccmd', [])

      expect(executed).toBe(true)
    })

    it('should pass correct player object to command service', async () => {
      const fakePlayer = new Player(
        { clientID: 42, accountID: 'player-123', meta: {} } as any,
        {} as any,
      )
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      global.source = 42

      await controller.handleCommandExecution(fakePlayer, 'test', ['arg'])

      // Verify the exact player object was passed
      expect(mockCommandService.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          clientID: 42,
          accountID: 'player-123',
        }),
        'test',
        ['arg'],
      )
    })

    it('should preserve argument order', async () => {
      const fakePlayer = new Player({ clientID: 1, meta: {} } as any, {} as any)
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      global.source = 1

      const args = ['arg1', 'arg2', 'arg3', 'arg4']
      await controller.handleCommandExecution(fakePlayer, 'test', args)

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'test', args)
    })

    it('should handle commands with special characters in name', async () => {
      const fakePlayer = new Player({ clientID: 1, meta: {} } as any, {} as any)
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      global.source = 1

      await controller.handleCommandExecution(fakePlayer, 'admin:ban', ['player123'])

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'admin:ban', [
        'player123',
      ])
    })

    it('should work with unauthenticated player (service handles auth)', async () => {
      // Player without accountID
      const fakePlayer = new Player({ clientID: 1, meta: {} } as any, {} as any)
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      global.source = 1

      // Controller should still pass to service (service enforces auth)
      await controller.handleCommandExecution(fakePlayer, 'test', [])

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'test', [])
    })
  })

  // Event listener metadata is tested via integration tests
})
