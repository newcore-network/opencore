export type CfxGameProfile = 'gta5' | 'rdr3' | 'common'

const RDR3_HINTS = ['rdr3', 'redm', 'rdr']
const GTA5_HINTS = ['gta5', 'fivem', 'gta']

function normalizeGameName(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function detectFromName(gameName: string): CfxGameProfile {
  if (!gameName) return 'common'
  if (RDR3_HINTS.some((hint) => gameName.includes(hint))) return 'rdr3'
  if (GTA5_HINTS.some((hint) => gameName.includes(hint))) return 'gta5'
  return 'common'
}

export function isCfxRuntime(): boolean {
  return typeof (globalThis as any).GetCurrentResourceName === 'function'
}

export function detectCfxGameProfile(): CfxGameProfile {
  const convar = (globalThis as any).GetConvar
  if (typeof convar === 'function') {
    const override = normalizeGameName(convar('opencore:gameProfile', ''))
    const profile = detectFromName(override)
    if (profile !== 'common') {
      return profile
    }
  }

  const getGameName = (globalThis as any).GetGameName
  if (typeof getGameName === 'function') {
    const profile = detectFromName(normalizeGameName(getGameName()))
    if (profile !== 'common') {
      return profile
    }
  }

  return 'common'
}
