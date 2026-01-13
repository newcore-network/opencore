import 'reflect-metadata'
import { container } from 'tsyringe'
import { beforeEach, describe, expect, it } from 'vitest'
import { PrincipalProviderContract } from '../../../src/runtime/server/contracts/security/principal-provider.contract'
import { setPrincipalProvider } from '../../../src/runtime/server/setup'
import { resetContainer } from '../../helpers/di.helper'

// Mock implementations
class MockPrincipalProvider extends PrincipalProviderContract {
  async getPrincipal(_player: any) {
    return { id: 'test-principal-id', permissions: [] }
  }
  async refreshPrincipal(_player: any) {}
  async getPrincipalByLinkedID(_linkedID: any) {
    return null
  }
}

describe('Server Bootstrap', () => {
  beforeEach(() => {
    resetContainer()
  })

  describe('Provider Setup', () => {
    it('should register PrincipalProvider in DI container', () => {
      setPrincipalProvider(MockPrincipalProvider)

      const isRegistered = container.isRegistered(PrincipalProviderContract as any)
      expect(isRegistered).toBe(true)
    })

    it('should resolve the registered PrincipalProvider', () => {
      setPrincipalProvider(MockPrincipalProvider)

      const resolved = container.resolve<PrincipalProviderContract>(
        PrincipalProviderContract as any,
      )
      expect(resolved).toBeInstanceOf(MockPrincipalProvider)
    })
  })

  describe('MockPrincipalProvider behavior', () => {
    it('should return principal with id and permissions', async () => {
      const provider = new MockPrincipalProvider()
      const mockPlayer = {} as any

      const principal = await provider.getPrincipal(mockPlayer)

      expect(principal).not.toBeNull()
      expect(principal?.id).toBe('test-principal-id')
      expect(principal?.permissions).toEqual([])
    })

    it('should refresh principal without error', async () => {
      const provider = new MockPrincipalProvider()
      const mockPlayer = {} as any

      await expect(provider.refreshPrincipal(mockPlayer)).resolves.not.toThrow()
    })

    it('should return null for getPrincipalByLinkedID', async () => {
      const provider = new MockPrincipalProvider()

      const principal = await provider.getPrincipalByLinkedID('some-id')

      expect(principal).toBeNull()
    })
  })
})
