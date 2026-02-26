import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IEngineEvents } from '../../../../src/adapters/contracts/IEngineEvents'
import type { IResourceInfo } from '../../../../src/adapters/contracts/IResourceInfo'
import type { CommandErrorObserverContract } from '../../../../src/runtime/server/contracts/security/command-error-observer.contract'
import { RemoteCommandExecutionController } from '../../../../src/runtime/server/controllers/remote-command-execution.controller'
import type { Players } from '../../../../src/runtime/server/ports/players.api-port'
import { createTestPlayer } from '../../../helpers'
import { CommandExecutionPort } from 'src/runtime/server/services'

vi.mock('../../../../src/runtime/server/runtime', () => ({
  getRuntimeContext: vi.fn(() => ({ mode: 'RESOURCE' })),
}))

describe('RemoteCommandExecutionController', () => {
  let mockCommandService: CommandExecutionPort
  let mockPlayerDirectory: Players
  let mockEngineEvents: IEngineEvents
  let mockResourceInfo: IResourceInfo
  let mockCommandErrorObserver: CommandErrorObserverContract
  let capturedEventHandler: ((clientID: number, commandName: string, args: string[]) => void) | null

  beforeEach(() => {
    capturedEventHandler = null

    // Create mock services
    mockCommandService = {
      register: vi.fn(),
      execute: vi.fn(),
      getAllCommands: vi.fn(() => []),
      getCommandMeta: vi.fn(() => undefined),
    } as any

    mockPlayerDirectory = {
      getByClient: vi.fn(),
      getAll: vi.fn(() => []),
    } as any

    // Create mock adapters
    mockEngineEvents = {
      on: vi.fn((_eventName: string, handler: any) => {
        capturedEventHandler = handler
      }),
      emit: vi.fn(),
    } as any

    mockResourceInfo = {
      getCurrentResourceName: vi.fn(() => 'test-resource'),
    } as any

    mockCommandErrorObserver = {
      onError: vi.fn(),
    } as any

    // Clear mocks before creating controller (constructor registers handler)
    vi.clearAllMocks()

    // Create controller - this will register the event handler
    new RemoteCommandExecutionController(
      mockCommandService,
      mockPlayerDirectory,
      mockCommandErrorObserver,
      mockEngineEvents,
      mockResourceInfo,
    )
  })

  describe('event registration', () => {
    it('should register event handler with correct event name', () => {
      expect(mockEngineEvents.on).toHaveBeenCalledWith(
        'opencore:command:execute:test-resource',
        expect.any(Function),
      )
    })

    it('should use resource name from IResourceInfo', () => {
      expect(mockResourceInfo.getCurrentResourceName).toHaveBeenCalled()
    })
  })

  describe('handleCommandExecution (via event handler)', () => {
    it('should execute command with player and args', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1, accountID: 'test-account' })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      // Simulate event from CORE
      await capturedEventHandler?.(1, 'heal', ['self'])

      expect(mockPlayerDirectory.getByClient).toHaveBeenCalledWith(1)
      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'heal', ['self'])
    })

    it('should handle command without arguments', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      await capturedEventHandler?.(1, 'ping', [])

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'ping', [])
    })

    it('should handle command with multiple arguments', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      await capturedEventHandler?.(1, 'teleport', ['100', '200', '300'])

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'teleport', [
        '100',
        '200',
        '300',
      ])
    })

    it('should not execute if player not found', async () => {
      // Player is null (not found in directory)
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(undefined)

      await capturedEventHandler?.(999, 'test', [])

      // Should not call execute
      expect(mockCommandService.execute).not.toHaveBeenCalled()
    })

    it('should handle execution errors gracefully', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      // Simulate error during execution
      const error = new Error('Command execution failed')
      ;(mockCommandService.execute as any).mockRejectedValue(error)

      // Should not throw, just log the error
      await expect(capturedEventHandler?.(1, 'failcmd', [])).resolves.toBeUndefined()

      expect(mockCommandService.execute).toHaveBeenCalled()
      expect(mockCommandErrorObserver.onError).toHaveBeenCalled()
    })

    it('should handle async command execution', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)

      let executed = false
      ;(mockCommandService.execute as any).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        executed = true
      })

      await capturedEventHandler?.(1, 'asynccmd', [])

      expect(executed).toBe(true)
    })

    it('should look up player by clientID and pass to command service', async () => {
      const fakePlayer = createTestPlayer({ clientID: 42, accountID: 'player-123' })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      await capturedEventHandler?.(42, 'test', ['arg'])

      // Verify player was looked up by clientID
      expect(mockPlayerDirectory.getByClient).toHaveBeenCalledWith(42)
      // Verify the resolved player object was passed
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
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      const args = ['arg1', 'arg2', 'arg3', 'arg4']
      await capturedEventHandler?.(1, 'test', args)

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'test', args)
    })

    it('should handle commands with special characters in name', async () => {
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      await capturedEventHandler?.(1, 'admin:ban', ['player123'])

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'admin:ban', [
        'player123',
      ])
    })

    it('should work with unauthenticated player (service handles auth)', async () => {
      // Player without accountID
      const fakePlayer = createTestPlayer({ clientID: 1 })
      ;(mockPlayerDirectory.getByClient as any).mockReturnValue(fakePlayer)
      ;(mockCommandService.execute as any).mockResolvedValue(undefined)

      // Controller should still pass to service (service enforces auth)
      await capturedEventHandler?.(1, 'test', [])

      expect(mockCommandService.execute).toHaveBeenCalledWith(fakePlayer, 'test', [])
    })
  })
})
