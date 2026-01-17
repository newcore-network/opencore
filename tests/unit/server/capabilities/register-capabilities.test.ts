import { describe, expect, it } from 'vitest'
import { IEngineEvents, IExports, INetTransport, IResourceInfo } from '../../../../src/adapters'
import { registerServerCapabilities } from '../../../../src/adapters/register-capabilities'
import { GLOBAL_CONTAINER } from '../../../../src/kernel/di/container'

describe('registerServerCapabilities', () => {
  it('registers and resolves capabilities', async () => {
    await registerServerCapabilities()

    expect(GLOBAL_CONTAINER.resolve(INetTransport as any)).toBeDefined()
    expect(GLOBAL_CONTAINER.resolve(IEngineEvents as any)).toBeDefined()
    expect(GLOBAL_CONTAINER.resolve(IExports as any)).toBeDefined()
    expect(GLOBAL_CONTAINER.resolve(IResourceInfo as any)).toBeDefined()
  })
})
