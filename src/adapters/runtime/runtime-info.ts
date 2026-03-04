import { detectCfxGameProfile, isCfxRuntime, type CfxGameProfile } from '../cfx/runtime-profile'

export type RuntimePlatform = 'cfx' | 'node'

export interface RuntimeInfo {
  platform: RuntimePlatform
  gameProfile: CfxGameProfile
}

export function detectRuntimeInfo(): RuntimeInfo {
  if (isCfxRuntime()) {
    return {
      platform: 'cfx',
      gameProfile: detectCfxGameProfile(),
    }
  }

  return {
    platform: 'node',
    gameProfile: 'common',
  }
}
