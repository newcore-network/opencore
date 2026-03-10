export interface RuntimeInfo {
  runtime: 'node' | 'cfx' | 'unknown'
  side: 'server' | 'client' | 'unknown'
  gameProfile: 'gta5' | 'rdr3' | 'common'
}

function detectSide(): RuntimeInfo['side'] {
  if (typeof (globalThis as any).IsDuplicityVersion === 'function') {
    return (globalThis as any).IsDuplicityVersion() ? 'server' : 'client'
  }

  return typeof window === 'undefined' ? 'server' : 'client'
}

function detectRuntime(): RuntimeInfo['runtime'] {
  if (typeof (globalThis as any).GetGameName === 'function') {
    return 'cfx'
  }

  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node'
  }

  return 'unknown'
}

function detectGameProfile(): RuntimeInfo['gameProfile'] {
  const getGameName = (globalThis as any).GetGameName
  if (typeof getGameName !== 'function') {
    return 'common'
  }

  const raw = String(getGameName()).toLowerCase()
  if (raw.includes('rdr')) return 'rdr3'
  if (raw.includes('gta')) return 'gta5'
  return 'common'
}

/**
 * Detects coarse runtime metadata for plugin configuration.
 */
export function detectRuntimeInfo(): RuntimeInfo {
  return {
    runtime: detectRuntime(),
    side: detectSide(),
    gameProfile: detectGameProfile(),
  }
}
