import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { detectEnvironmentSide, getRuntimeSide, isClientSide, isServerSide } from '../../../src'

describe('runtime side helpers', () => {
  it('should expose root aliases for runtime side detection', () => {
    expect(getRuntimeSide()).toBe(detectEnvironmentSide())
  })

  it('should keep client/server boolean helpers consistent', () => {
    const side = getRuntimeSide()

    expect(isClientSide()).toBe(side === 'client')
    expect(isServerSide()).toBe(side === 'server')
  })
})
