export type FrameworkMode = 'CORE' | 'RESOURCE' | 'STANDALONE'

/**
 * Feature provider source configuration.
 *
 * @remarks
 * Determines where a feature's implementation comes from:
 *
 * - `'core'`: Feature provided by CORE resource via exports
 *   - Used in RESOURCE mode for: players, principal, auth, commands
 *   - Triggers remote service implementations that delegate to CORE
 *
 * - `'local'`: Feature implemented locally in current resource
 *   - Used in CORE/STANDALONE for all features
 *   - Used in RESOURCE for: netEvents, fiveMEvents, exports, http, chat
 *   - Triggers local service implementations
 *
 * @example
 * ```typescript
 * // RESOURCE mode - commands delegate to CORE
 * commands: { enabled: true, provider: 'core' }
 *
 * // STANDALONE mode - commands execute locally
 * commands: { enabled: true, provider: 'local' }
 * ```
 */
export type FeatureProvider = 'core' | 'local'
export type FeatureScope = 'core' | 'resource' | 'standalone'

export type FeatureName =
  | 'players'
  | 'netEvents'
  | 'fiveMEvents'
  | 'commands'
  | 'exports'
  | 'chat'
  | 'principal'
  | 'sessionLifecycle'

// ========================================
// USER CONFIG (what users configure)
// ========================================

/**
 * User-facing feature configuration.
 *
 * @remarks
 * Most features are enabled by default and providers are auto-inferred.
 * Use this config only if you need to explicitly disable a feature.
 */
export interface UserFeatureConfig {
  /** Disable specific features if needed */
  disabled?: FeatureName[]
}

// ========================================
// INTERNAL CONTRACT (framework internals)
// ========================================

/**
 * Internal feature contract with all fields resolved.
 *
 * @remarks
 * This is used internally by the framework after merging user config with defaults.
 * Users don't interact with this directly.
 *
 * @internal
 */
export interface FeatureContract {
  /**
   * Enables or disables the feature at runtime.
   *
   * If `required` is `true`, this must also be `true` (otherwise validation will throw).
   */
  enabled: boolean
  /**
   * Determines where the implementation comes from.
   *
   * - `core`: feature is provided by the core resource (via exports when applicable)
   * - `local`: feature is implemented/handled locally by the current runtime (resource/standalone)
   */
  provider: FeatureProvider
  /**
   * Marks the feature as exportable via FiveM exports.
   *
   * Only meaningful in CORE mode. When `true`, the framework dynamically imports
   * export controllers that expose the feature's API to RESOURCE mode.
   */
  export: boolean
  /**
   * The runtime scope this feature contract is intended for.
   *
   * Must match the scope derived from the current FrameworkMode
   */
  scope: FeatureScope
  /**
   * Marks the feature as mandatory for the current runtime configuration.
   *
   * When `true`, the feature cannot be disabled (`enabled` must be `true`).
   */
  required: boolean
  /**
   * (sessionLifecycle only) Enable automatic session recovery on resource restart.
   *
   * @remarks
   * When true, scans for connected players on startup and creates sessions
   * for any that don't have an active session.
   *
   * @defaultValue true
   */
  recoveryOnRestart?: boolean
}

export type FrameworkFeatures = Record<FeatureName, FeatureContract>

export interface DevModeConfig {
  /** Enable dev mode */
  enabled: boolean
  /** Hot reload configuration */
  hotReload?: {
    enabled: boolean
    port: number
    allowedResources?: string[]
  }
  /** CLI bridge configuration */
  bridge?: {
    url: string
    autoConnect: boolean
  }
  /** Event interceptor configuration */
  interceptor?: {
    enabled: boolean
    recordHistory: boolean
    maxHistorySize: number
  }
  /** Player simulator configuration */
  simulator?: {
    enabled: boolean
    autoConnectPlayers: number
  }
}

export interface Hooks {
  waitFor?: Promise<any> | Promise<any>[]
  onReady?: () => Promise<void> | void
}

export interface ServerRuntimeOptions {
  mode: FrameworkMode
  features: FrameworkFeatures
  coreResourceName: string
  /** Development mode configuration (disabled in production) */
  devMode?: DevModeConfig
  onDependency?: Hooks
}

export type RuntimeContext = ServerRuntimeOptions

const FEATURE_NAMES: FeatureName[] = [
  'players',
  'netEvents',
  'fiveMEvents',
  'commands',
  'exports',
  'chat',
  'principal',
  'sessionLifecycle',
]

const FEATURE_ALLOWED_SCOPES: Record<FeatureName, FeatureScope[]> = {
  players: ['core', 'resource', 'standalone'],
  netEvents: ['core', 'resource', 'standalone'],
  fiveMEvents: ['core', 'resource', 'standalone'],
  commands: ['core', 'resource', 'standalone'],
  exports: ['core', 'resource', 'standalone'],
  chat: ['core', 'resource', 'standalone'],
  principal: ['core', 'resource', 'standalone'],
  sessionLifecycle: ['core', 'standalone'],
}

let runtimeContext: RuntimeContext | null = null

export function setRuntimeContext(ctx: RuntimeContext): void {
  runtimeContext = ctx
}

export function getRuntimeContext(): RuntimeContext {
  if (!runtimeContext) {
    throw new Error(
      '[OpenCore] RuntimeContext is not initialized. Call Server.init({ mode, ... }) before using the framework.',
    )
  }
  return runtimeContext
}

export function getFrameworkModeScope(mode: FrameworkMode): FeatureScope {
  if (mode === 'CORE') return 'core'
  if (mode === 'RESOURCE') return 'resource'
  return 'standalone'
}

/**
 * Server initialization configuration.
 *
 * @remarks
 * Defines the runtime mode and feature configuration for OpenCore.
 *
 * @example Minimal Mode
 * ```typescript
 * Server.init({
 *   mode: 'CORE'
 * })
 * ```
 */
export interface ServerInitOptions {
  /** Runtime mode determining feature availability and provider sources */
  mode: FrameworkMode

  /**
   * Feature configuration.
   *
   * @remarks
   * Most features are enabled by default. Use this only to disable specific ones.
   */
  features?: UserFeatureConfig

  /**
   * Name of the CORE resource.
   *
   * @remarks
   * - **Required in RESOURCE mode** (to locate CORE exports)
   * - Optional in CORE/STANDALONE modes
   *
   * @defaultValue 'core'
   */
  coreResourceName?: string

  /** Development mode configuration (disabled in production) */
  devMode?: DevModeConfig

  /** If you want to wait for a dependency promise, or when ready do something (By default, the core server will emit a "ready" when it is ready to all resources.)  */
  onDependency?: Hooks
}

function createDefaultFeatures(mode: FrameworkMode): FrameworkFeatures {
  const scope = getFrameworkModeScope(mode)

  // Provider logic:
  // - CORE/STANDALONE: All features use 'local' (run locally)
  // - RESOURCE: Identity/Command features delegate to CORE ('core'), others run locally ('local')
  const remoteProvider: FeatureProvider = mode === 'RESOURCE' ? 'core' : 'local'

  const isResource = mode === 'RESOURCE'
  const isCore = mode === 'CORE'

  return {
    players: {
      enabled: true,
      provider: remoteProvider,
      export: isCore,
      scope,
      required: true,
    },
    netEvents: {
      enabled: true,
      provider: 'local',
      export: false,
      scope,
      required: true,
    },
    fiveMEvents: {
      enabled: true,
      provider: 'local',
      export: false,
      scope,
      required: false,
    },
    commands: {
      enabled: true,
      provider: remoteProvider,
      export: isCore,
      scope,
      required: true,
    },
    exports: {
      enabled: true,
      provider: 'local',
      export: false,
      scope,
      required: isCore,
    },
    chat: {
      enabled: true,
      provider: 'local',
      export: isCore,
      scope,
      required: false,
    },
    principal: {
      enabled: true,
      provider: remoteProvider,
      export: isCore,
      scope,
      required: false,
    },
    sessionLifecycle: {
      enabled: !isResource,
      provider: 'local',
      export: false,
      scope,
      required: false,
      recoveryOnRestart: true,
    },
  }
}

export function resolveRuntimeOptions(options: ServerInitOptions): ServerRuntimeOptions {
  const features = createDefaultFeatures(options.mode)

  if (options.features?.disabled) {
    for (const name of options.features.disabled) {
      if (features[name]) {
        features[name].enabled = false
      }
    }
  }

  return {
    mode: options.mode,
    features,
    coreResourceName: options.coreResourceName ?? 'core',
    devMode: options.devMode,
    onDependency: options.onDependency,
  }
}

function assertFeatureKeys(features: any): asserts features is FrameworkFeatures {
  if (!features) {
    throw new Error('[OpenCore] Runtime options are missing features configuration')
  }
  const keys = Object.keys(features)
  for (const key of keys) {
    if (!FEATURE_NAMES.includes(key as FeatureName)) {
      throw new Error(`[OpenCore] Unknown feature: '${key}'`)
    }
  }
}

export function validateRuntimeOptions(options: ServerRuntimeOptions): void {
  const { mode, features } = options

  assertFeatureKeys(features)

  // If in RESOURCE mode, must have coreResourceName
  if (mode === 'RESOURCE' && !options.coreResourceName) {
    throw new Error('[OpenCore] RESOURCE mode requires coreResourceName to be specified')
  }

  // Determine which features need CORE exports in RESOURCE mode
  const needsCoreExports =
    mode === 'RESOURCE' &&
    (features.players.provider === 'core' ||
      features.commands.provider === 'core' ||
      features.principal.provider === 'core')

  // Validate coreResourceName exists if needed
  if (mode === 'RESOURCE') {
    const { coreResourceName } = options

    if (needsCoreExports) {
      const core = (globalThis as any).exports?.[coreResourceName]
      if (!core) {
        throw new Error(
          `[OpenCore] CORE resource '${coreResourceName}' not found. Ensure it is started before RESOURCE mode resources.`,
        )
      }
    }
  }

  const scope = getFrameworkModeScope(mode)

  for (const name of FEATURE_NAMES) {
    const f = features[name]

    if (!f.enabled) {
      if (f.required) {
        throw new Error(`[OpenCore] Feature '${name}' is required but disabled`)
      }
      continue
    }

    const allowedScopes = FEATURE_ALLOWED_SCOPES[name]
    if (!allowedScopes.includes(scope)) {
      throw new Error(
        `[OpenCore] Feature '${name}' is not allowed in scope '${scope}' (allowed: ${allowedScopes.join(', ')})`,
      )
    }

    if (f.scope !== scope) {
      throw new Error(
        `[OpenCore] Invalid scope for feature '${name}': expected '${scope}' for mode '${mode}', received '${f.scope}'`,
      )
    }

    if (f.export && !features.exports.enabled) {
      throw new Error(`[OpenCore] Feature '${name}' cannot be exported when 'exports' is disabled`)
    }

    // Validate provider combinations
    if (mode === 'CORE' && f.provider === 'core') {
      throw new Error(
        `[OpenCore] Feature '${name}' cannot use provider='core' in CORE mode (use 'local' instead)`,
      )
    }

    if (mode === 'RESOURCE' && f.provider === 'core' && f.export) {
      throw new Error(
        `[OpenCore] Feature '${name}' cannot set export=true when provider='core' in RESOURCE mode`,
      )
    }
  }

  // Feature-specific validations
  if (features.players.enabled && mode === 'RESOURCE' && features.players.provider !== 'core') {
    throw new Error(`[OpenCore] Feature 'players' must use provider 'core' in RESOURCE mode`)
  }

  if (features.principal.enabled && mode === 'RESOURCE' && features.principal.provider !== 'core') {
    throw new Error(`[OpenCore] Feature 'principal' must use provider 'core' in RESOURCE mode`)
  }

  if (features.commands.enabled && mode === 'RESOURCE' && features.commands.provider !== 'core') {
    throw new Error(`[OpenCore] Feature 'commands' must use provider 'core' in RESOURCE mode`)
  }

  // Commands export validation
  if (features.commands.export && mode !== 'CORE') {
    throw new Error(
      `[OpenCore] Feature 'commands' can only be exported in CORE mode (current mode: '${mode}')`,
    )
  }

  // Validate dependencies
  if (features.commands.enabled && !features.players.enabled) {
    throw new Error(`[OpenCore] Feature 'commands' requires 'players' to be enabled`)
  }

  if (features.netEvents.enabled && !features.players.enabled) {
    throw new Error(`[OpenCore] Feature 'netEvents' requires 'players' to be enabled`)
  }

  if (features.chat.enabled && !features.players.enabled) {
    throw new Error(`[OpenCore] Feature 'chat' requires 'players' to be enabled`)
  }
}

/**
 * @deprecated Use validateRuntimeOptions instead
 */
export const validateRuntimeContextOrThrow = validateRuntimeOptions
