import 'reflect-metadata'
import { beforeEach, describe, expect, it } from 'vitest'
import { di } from '../../../../src/runtime/client/client-container'
import { initClientCore } from '../../../../src/runtime/client/client-bootstrap'
import { IClientRuntimeBridge } from '../../../../src/runtime/client/adapter/runtime-bridge'
import { getActiveClientAdapterName } from '../../../../src/runtime/client/adapter/registry'
import { resetContainer } from '../../../helpers/di.helper'

describe('client adapter bootstrap', () => {
  beforeEach(() => {
    resetContainer()
  })

  it('installs the default node client adapter', async () => {
    await initClientCore({ mode: 'STANDALONE' })

    expect(getActiveClientAdapterName()).toBe('node')
    expect(di.isRegistered(IClientRuntimeBridge as any)).toBe(true)

    const runtime = di.resolve(IClientRuntimeBridge as any) as IClientRuntimeBridge
    expect(runtime.getCurrentResourceName()).toBe('default')
  })
})
