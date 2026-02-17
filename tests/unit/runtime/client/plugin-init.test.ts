import { describe, expect, it, vi } from 'vitest'
import { Client } from '../../../../src/runtime/client/client-api-runtime'
import { init } from '../../../../src/runtime/client/client-core'
import { initClientCore } from '../../../../src/runtime/client/client-bootstrap'

vi.mock('../../../../src/runtime/client/client-bootstrap', () => ({
  initClientCore: vi.fn(async () => undefined),
}))

describe('Client plugin init integration', () => {
  it('installs plugins before client bootstrap', async () => {
    const key = `PluginInitExt_${Date.now()}`
    const extension = vi.fn()

    vi.mocked(initClientCore).mockImplementationOnce(async () => {
      expect((Client as any)[key]).toBe(extension)
    })

    await init({
      mode: 'STANDALONE',
      plugins: [
        {
          name: 'plugin-init-test',
          install(ctx) {
            ctx.client.registerApiExtension(key, extension)
          },
        },
      ],
    })

    expect(initClientCore).toHaveBeenCalledWith(expect.objectContaining({ mode: 'STANDALONE' }))
  })
})
