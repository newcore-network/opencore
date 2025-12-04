import 'reflect-metadata'
import { beforeEach, afterEach, vi } from 'vitest'
import { installGlobalMocks, resetCitizenFxMocks } from './mocks/citizenfx'
import { resetContainer } from './helpers/di.helper'

// Install FiveM API mocks globally
installGlobalMocks()

// Reset state before each test
beforeEach(() => {
  resetCitizenFxMocks()
  resetContainer()
  vi.clearAllMocks()
})

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks()
})

