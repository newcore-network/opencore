import { describe, it, expect } from 'vitest'
import { di } from '../../../../src/server/container'
import { registerServerCapabilities } from '../../../../src/server/capabilities/register-capabilities'
import { INetTransport } from '../../../../src/server/capabilities/INetTransport'
import { IEngineEvents } from '../../../../src/server/capabilities/IEngineEvents'
import { IExports } from '../../../../src/server/capabilities/IExports'
import { IResourceInfo } from '../../../../src/server/capabilities/IResourceInfo'

describe('registerServerCapabilities', () => {
  it('registers and resolves capabilities', () => {
    registerServerCapabilities()

    expect(di.resolve(INetTransport as any)).toBeDefined()
    expect(di.resolve(IEngineEvents as any)).toBeDefined()
    expect(di.resolve(IExports as any)).toBeDefined()
    expect(di.resolve(IResourceInfo as any)).toBeDefined()
  })
})
