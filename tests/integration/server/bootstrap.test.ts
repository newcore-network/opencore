import 'reflect-metadata'
import { container } from 'tsyringe'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProviderContract } from '../../../src/runtime/server/contracts/auth-provider.contract'
import { PrincipalProviderContract } from '../../../src/runtime/server/contracts/security/principal-provider.contract'
import { setAuthProvider, setPrincipalProvider } from '../../../src/runtime/server/setup'
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

class MockAuthProvider extends AuthProviderContract {
  async authenticate(_player: any, _credentials: any) {
    return { success: true, accountID: 'test-account-id' }
  }
  async register(_player: any, _credentials: any) {
    return { success: true, accountID: 'new-account-id', isNewAccount: true }
  }
  async validateSession(_player: any) {
    return { success: true, accountID: 'test-account-id' }
  }
  async logout(_player: any) {}
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

    it('should register AuthProvider in DI container', () => {
      setAuthProvider(MockAuthProvider)

      const isRegistered = container.isRegistered(AuthProviderContract as any)
      expect(isRegistered).toBe(true)
    })

    it('should resolve the registered PrincipalProvider', () => {
      setPrincipalProvider(MockPrincipalProvider)

      const resolved = container.resolve<PrincipalProviderContract>(
        PrincipalProviderContract as any,
      )
      expect(resolved).toBeInstanceOf(MockPrincipalProvider)
    })

    it('should resolve the registered AuthProvider', () => {
      setAuthProvider(MockAuthProvider)

      const resolved = container.resolve<AuthProviderContract>(AuthProviderContract as any)
      expect(resolved).toBeInstanceOf(MockAuthProvider)
    })

    it('should allow registering both providers', () => {
      setPrincipalProvider(MockPrincipalProvider)
      setAuthProvider(MockAuthProvider)

      expect(container.isRegistered(PrincipalProviderContract as any)).toBe(true)
      expect(container.isRegistered(AuthProviderContract as any)).toBe(true)
    })
  })

  describe('MockAuthProvider behavior', () => {
    it('should authenticate successfully', async () => {
      const provider = new MockAuthProvider()
      const mockPlayer = {} as any

      const result = await provider.authenticate(mockPlayer, { license: 'test' })

      expect(result.success).toBe(true)
      expect(result.accountID).toBe('test-account-id')
    })

    it('should register new accounts', async () => {
      const provider = new MockAuthProvider()
      const mockPlayer = {} as any

      const result = await provider.register(mockPlayer, { username: 'test', password: '1234' })

      expect(result.success).toBe(true)
      expect(result.isNewAccount).toBe(true)
    })

    it('should validate session', async () => {
      const provider = new MockAuthProvider()
      const mockPlayer = {} as any

      const result = await provider.validateSession(mockPlayer)

      expect(result.success).toBe(true)
      expect(result.accountID).toBe('test-account-id')
    })

    it('should logout without error', async () => {
      const provider = new MockAuthProvider()
      const mockPlayer = {} as any

      await expect(provider.logout(mockPlayer)).resolves.not.toThrow()
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
