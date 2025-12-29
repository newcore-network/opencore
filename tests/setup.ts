import 'reflect-metadata'
import { beforeEach, vi } from 'vitest'
import { resetContainer } from './helpers/di.helper'
import { installGlobalMocks, resetCitizenFxMocks } from './mocks/citizenfx'

// Install FiveM API mocks globally
installGlobalMocks()

// Reset state before each test
beforeEach(() => {
  resetCitizenFxMocks()
  resetContainer()
  vi.clearAllMocks()
})
