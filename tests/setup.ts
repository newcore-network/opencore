import 'reflect-metadata'
import { beforeEach, vi } from 'vitest'
import { resetContainer } from './helpers/di.helper'
import { installGlobalMocks, resetCitizenFxMocks } from './mocks/citizenfx'

installGlobalMocks()

beforeEach(() => {
  resetCitizenFxMocks()
  resetContainer()
  vi.clearAllMocks()
})
