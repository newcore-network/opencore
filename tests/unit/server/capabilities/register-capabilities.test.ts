import { describe, expect, it } from 'vitest'
import { IEngineEvents, IExports, INetTransport, IResourceInfo } from '../../../../src/adapters'
import { registerServerCapabilities } from '../../../../src/adapters/register-capabilities'
import { di } from '../../../../src/kernel/di/container'

describe('registerServerCapabilities', () => {
  it('registers and resolves capabilities', async () => {
    await registerServerCapabilities()

    expect(di.resolve(INetTransport as any)).toBeDefined()
    expect(di.resolve(IEngineEvents as any)).toBeDefined()
    expect(di.resolve(IExports as any)).toBeDefined()
    expect(di.resolve(IResourceInfo as any)).toBeDefined()
  })
})
