import 'reflect-metadata'
import { container } from 'tsyringe'
import { describe, expect, it } from 'vitest'
import { Service } from '../../../../src/runtime/client'

describe('client @Service decorator', () => {
  it('should register client services as singletons by default', () => {
    @Service()
    class SelectionService {
      id = Math.random()
    }

    const first = container.resolve(SelectionService)
    const second = container.resolve(SelectionService)

    expect(first).toBe(second)
    expect(first.id).toBe(second.id)
  })

  it('should support transient scope', () => {
    @Service({ scope: 'transient' })
    class PreviewService {
      id = Math.random()
    }

    const first = container.resolve(PreviewService)
    const second = container.resolve(PreviewService)

    expect(first).not.toBe(second)
    expect(first.id).not.toBe(second.id)
  })

  it('should make services resolvable from the public client API', () => {
    @Service()
    class SelectionService {
      focusCharacter() {
        return 'focused'
      }
    }

    const instance = container.resolve(SelectionService)

    expect(instance).toBeInstanceOf(SelectionService)
    expect(instance.focusCharacter()).toBe('focused')
  })
})
