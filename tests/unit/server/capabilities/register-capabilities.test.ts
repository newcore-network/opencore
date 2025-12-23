import { describe, it, expect } from 'vitest'
import { di } from '../../../../src/kernel/di/container'
import { registerServerCapabilities } from '../../../../src/adapters/register-capabilities'
import { IEngineEvents, IExports, INetTransport, IResourceInfo } from '../../../../src/adapters'

describe('registerServerCapabilities', () => {
  it('registers and resolves capabilities', async () => {
    await registerServerCapabilities()

    expect(di.resolve(INetTransport as any)).toBeDefined()
    expect(di.resolve(IEngineEvents as any)).toBeDefined()
    expect(di.resolve(IExports as any)).toBeDefined()
    expect(di.resolve(IResourceInfo as any)).toBeDefined()
  })
})
