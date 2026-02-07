import { describe, expect, it } from 'vitest'
import {
  IEngineEvents,
  IExports,
  MessagingTransport,
  IResourceInfo,
} from '../../../../src/adapters'
import { registerServerCapabilities } from '../../../../src/adapters/register-capabilities'
import { GLOBAL_CONTAINER } from '../../../../src/kernel/di/container'

describe('registerServerCapabilities', () => {
  it('registers and resolves capabilities', async () => {
    await registerServerCapabilities('node')

    expect(GLOBAL_CONTAINER.resolve(MessagingTransport as any)).toBeDefined()
    expect(GLOBAL_CONTAINER.resolve(IEngineEvents as any)).toBeDefined()
    expect(GLOBAL_CONTAINER.resolve(IExports as any)).toBeDefined()
    expect(GLOBAL_CONTAINER.resolve(IResourceInfo as any)).toBeDefined()
  })
})
