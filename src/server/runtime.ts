export type FrameworkMode = 'CORE' | 'RESOURCE' | 'STANDALONE'

export type FeatureProvider = 'core' | 'local'
export type FeatureScope = 'core' | 'resource' | 'standalone'

export type FeatureName =
  | 'players'
  | 'netEvents'
  | 'fiveMEvents'
  | 'commands'
  | 'exports'
  | 'http'
  | 'chat'
  | 'database'
  | 'principal'
  | 'auth'
  | 'sessionLifecycle'

export interface FeatureContract {
  enabled: boolean
  provider: FeatureProvider
  export: boolean
  scope: FeatureScope
  required: boolean
}

export type FrameworkFeatures = Record<FeatureName, FeatureContract>

export interface ServerRuntimeOptions {
  mode: FrameworkMode
  features: FrameworkFeatures
}

export type RuntimeContext = ServerRuntimeOptions

const FEATURE_NAMES: FeatureName[] = [
  'players',
  'netEvents',
  'fiveMEvents',
  'commands',
  'exports',
  'http',
  'chat',
  'database',
  'principal',
  'auth',
  'sessionLifecycle',
]

const FEATURE_ALLOWED_SCOPES: Record<FeatureName, FeatureScope[]> = {
  players: ['core', 'resource', 'standalone'],
  netEvents: ['core', 'resource', 'standalone'],
  fiveMEvents: ['core', 'resource', 'standalone'],
  commands: ['core', 'resource', 'standalone'],
  exports: ['core', 'resource', 'standalone'],
  http: ['core', 'resource', 'standalone'],
  chat: ['core', 'resource', 'standalone'],
  database: ['core', 'resource', 'standalone'],
  principal: ['core', 'resource', 'standalone'],
  auth: ['core', 'resource', 'standalone'],
  sessionLifecycle: ['core', 'standalone'],
}

let runtimeContext: RuntimeContext | null = null

export function setRuntimeContext(ctx: RuntimeContext): void {
  runtimeContext = ctx
}

export function getRuntimeContext(): RuntimeContext {
  if (!runtimeContext) {
    throw new Error(
      '[OpenCore] RuntimeContext is not initialized. Call Server.init({ mode, features }) before using the framework.',
    )
  }
  return runtimeContext
}

export function getFrameworkModeScope(mode: FrameworkMode): FeatureScope {
  if (mode === 'CORE') return 'core'
  if (mode === 'RESOURCE') return 'resource'
  return 'standalone'
}

function assertFeatureKeys(features: any): asserts features is FrameworkFeatures {
  if (!features || typeof features !== 'object') {
    throw new Error(`[OpenCore] Invalid features: expected object, received ${typeof features}`)
  }

  const missing: string[] = []
  for (const name of FEATURE_NAMES) {
    if (!(name in features)) missing.push(name)
  }

  if (missing.length) {
    throw new Error(`[OpenCore] Missing feature contracts: ${missing.join(', ')}`)
  }
}

export function validateRuntimeContextOrThrow(ctx: RuntimeContext): void {
  if (!ctx || typeof ctx !== 'object') {
    throw new Error('[OpenCore] Invalid runtime options')
  }

  const { mode, features } = ctx
  if (!mode) throw new Error('[OpenCore] Runtime mode is required')

  assertFeatureKeys(features)

  const scope = getFrameworkModeScope(mode)

  for (const name of FEATURE_NAMES) {
    const f = features[name]

    if (!f || typeof f !== 'object') {
      throw new Error(`[OpenCore] Invalid feature contract for '${name}'`)
    }

    if (f.required && !f.enabled) {
      throw new Error(`[OpenCore] Feature '${name}' is required but disabled`)
    }

    if (!f.enabled) {
      continue
    }

    if (!FEATURE_ALLOWED_SCOPES[name].includes(scope)) {
      throw new Error(`[OpenCore] Feature '${name}' cannot be enabled in mode '${mode}'`)
    }

    if (f.scope !== scope) {
      throw new Error(
        `[OpenCore] Invalid scope for feature '${name}': expected '${scope}' for mode '${mode}', received '${f.scope}'`,
      )
    }

    if (f.export && !features.exports.enabled) {
      throw new Error(`[OpenCore] Feature '${name}' cannot be exported when 'exports' is disabled`)
    }

    if (mode === 'CORE' && f.provider !== 'core') {
      throw new Error(`[OpenCore] Feature '${name}' must use provider 'core' in CORE mode`)
    }

    if (mode === 'STANDALONE' && f.provider !== 'local') {
      throw new Error(`[OpenCore] Feature '${name}' must use provider 'local' in STANDALONE mode`)
    }

    if (mode === 'RESOURCE' && f.provider === 'core' && f.export) {
      throw new Error(
        `[OpenCore] Feature '${name}' cannot set export=true when provider='core' in RESOURCE mode`,
      )
    }
  }

  if (features.players.enabled && mode === 'RESOURCE' && features.players.provider !== 'core') {
    throw new Error(`[OpenCore] Feature 'players' must use provider 'core' in RESOURCE mode`)
  }

  if (features.principal.enabled && mode === 'RESOURCE' && features.principal.provider !== 'core') {
    throw new Error(`[OpenCore] Feature 'principal' must use provider 'core' in RESOURCE mode`)
  }

  if (features.auth.enabled && mode === 'RESOURCE' && features.auth.provider !== 'core') {
    throw new Error(`[OpenCore] Feature 'auth' must use provider 'core' in RESOURCE mode`)
  }

  if (features.sessionLifecycle.enabled && !features.players.enabled) {
    throw new Error(`[OpenCore] Feature 'sessionLifecycle' requires 'players' to be enabled`)
  }

  if (features.netEvents.enabled && !features.players.enabled) {
    throw new Error(`[OpenCore] Feature 'netEvents' requires 'players' to be enabled`)
  }

  if (features.commands.enabled && !features.netEvents.enabled) {
    throw new Error(`[OpenCore] Feature 'commands' requires 'netEvents' to be enabled`)
  }

  if (features.chat.enabled && !features.players.enabled) {
    throw new Error(`[OpenCore] Feature 'chat' requires 'players' to be enabled`)
  }

  if (features.principal.enabled && !features.players.enabled) {
    throw new Error(`[OpenCore] Feature 'principal' requires 'players' to be enabled`)
  }

  if (features.auth.enabled && !features.players.enabled) {
    throw new Error(`[OpenCore] Feature 'auth' requires 'players' to be enabled`)
  }
}
