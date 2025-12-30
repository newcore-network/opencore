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
 *   - Used in RESOURCE for: netEvents, fiveMEvents, exports, http, chat, database
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
  | 'http'
  | 'chat'
  | 'database'
  | 'principal'
  | 'auth'
  | 'sessionLifecycle'

// ========================================
// USER CONFIG (what users configure)
// ========================================

/**
 * Base feature configuration (all features support this).
 */
export interface BaseFeatureConfig {
  /**
   * Enable or disable this feature.
   *
   * @defaultValue Varies by feature and mode (see specific feature docs)
   */
  enabled?: boolean
}

/**
 * Feature configuration with configurable provider.
 *
 * @remarks
 * Only applies to: `players`, `commands`, `principal`, `auth`
 *
 * For these features, you can choose:
 * - `'core'`: Use CORE's implementation (RESOURCE mode)
 * - `'local'`: Use local implementation (STANDALONE mode)
 *
 * **Defaults by mode:**
 * - CORE: `'core'`
 * - RESOURCE: `'core'` (delegates to CORE)
 * - STANDALONE: `'local'`
 */
export interface ProviderFeatureConfig extends BaseFeatureConfig {
  /**
   * Provider source for this feature.
   *
   * @remarks
   * - RESOURCE mode: Use `'core'` to delegate to CORE (default)
   * - STANDALONE mode: Must use `'local'` (default)
   */
  provider?: FeatureProvider
}

/**
 * Feature configuration with export option (CORE mode only).
 *
 * @remarks
 * Only applies to: `players`, `principal`, `chat` in CORE mode
 *
 * When `export: true`, the feature exposes FiveM exports for RESOURCE mode access.
 */
export interface ExportableFeatureConfig extends BaseFeatureConfig {
  /**
   * Whether to expose this feature via FiveM exports.
   *
   * @remarks
   * - Only valid in CORE mode
   * - Requires `exports` feature to be enabled
   * - Used by RESOURCE mode to access CORE functionality
   *
   * @defaultValue false
   */
  export?: boolean
}

/**
 * User-facing feature configuration.
 *
 * @remarks
 * This is what users configure in `Server.init({ features: {...} })`.
 * Internal fields like `scope` and `required` are auto-managed by the framework.
 */
export interface UserFeatureConfig {
  /**
   * Player management and directory.
   *
   * @remarks
   * **Dependencies**: None
   * **Provider**: Configurable
   * - CORE/STANDALONE: Local player management
   * - RESOURCE: Delegates to CORE
   *
   * **Export** (CORE only): When true, exposes player APIs to RESOURCE mode
   *
   * @defaultValue
   * - enabled: true
   * - provider: 'core' (RESOURCE), 'core' (CORE), 'local' (STANDALONE)
   * - export: false
   */
  players?: ProviderFeatureConfig & ExportableFeatureConfig

  /**
   * Command registration and execution.
   *
   * @remarks
   * **Dependencies**: Requires `players` to be enabled
   * **Provider**: Configurable
   * - CORE/STANDALONE: Local command execution
   * - RESOURCE: Commands register with CORE for centralized security validation
   *
   * **Export** (CORE only): Always exported when enabled (for RESOURCE mode access)
   *
   * @defaultValue
   * - enabled: false
   * - provider: 'core' (RESOURCE), 'local' (CORE/STANDALONE)
   * - export: true (CORE only, automatic)
   */
  commands?: ProviderFeatureConfig

  /**
   * Principal (identity) provider for permissions.
   *
   * @remarks
   * **Dependencies**: None
   * **Provider**: Configurable
   * - CORE: User-provided PrincipalProvider implementation
   * - RESOURCE: Delegates to CORE
   * - STANDALONE: User-provided PrincipalProvider implementation
   *
   * **Export** (CORE only): When true, exposes principal APIs to RESOURCE mode
   *
   * @defaultValue
   * - enabled: false
   * - provider: 'core' (RESOURCE), 'core' (CORE), 'local' (STANDALONE)
   * - export: false
   */
  principal?: ProviderFeatureConfig & ExportableFeatureConfig

  /**
   * Authentication provider for login/logout.
   *
   * @remarks
   * **Dependencies**: None
   * **Provider**: Configurable
   * - CORE: User-provided AuthProvider implementation
   * - RESOURCE: Delegates to CORE
   * - STANDALONE: User-provided AuthProvider implementation
   *
   * @defaultValue
   * - enabled: false
   * - provider: 'core' (RESOURCE), 'core' (CORE), 'local' (STANDALONE)
   */
  auth?: ProviderFeatureConfig

  /**
   * Network events (`onNet` decorator support).
   *
   * @remarks
   * **Dependencies**: Requires `players` to be enabled
   * **Provider**: Auto-determined (not configurable)
   * - Always `'local'` (events are handled locally in each resource)
   *
   * @defaultValue enabled: true
   */
  netEvents?: BaseFeatureConfig

  /**
   * FiveM lifecycle events (`onServer`, `onClient`, etc.).
   *
   * @remarks
   * **Dependencies**: None
   * **Provider**: Auto-determined (not configurable)
   * - Always `'local'`
   * - Disabled in RESOURCE mode (only CORE/STANDALONE need lifecycle management)
   *
   * @defaultValue
   * - enabled: true (CORE/STANDALONE), false (RESOURCE)
   */
  fiveMEvents?: BaseFeatureConfig

  /**
   * FiveM exports support (`@Export` decorator).
   *
   * @remarks
   * **Dependencies**: None
   * **Provider**: Auto-determined (not configurable)
   * - Always `'local'`
   *
   * @defaultValue enabled: false
   */
  exports?: BaseFeatureConfig

  /**
   * HTTP server and endpoints.
   *
   * @remarks
   * **Dependencies**: None
   * **Provider**: Auto-determined (not configurable)
   * - Always `'local'`
   *
   * @defaultValue enabled: false
   */
  http?: BaseFeatureConfig

  /**
   * Chat message handling.
   *
   * @remarks
   * **Dependencies**: Requires `players` to be enabled
   * **Provider**: Auto-determined (not configurable)
   * - Always `'local'`
   *
   * **Export** (CORE only): When true, exposes chat APIs to RESOURCE mode
   *
   * @defaultValue
   * - enabled: false
   * - export: false
   */
  chat?: BaseFeatureConfig & ExportableFeatureConfig

  /**
   * Database access.
   *
   * @remarks
   * **Dependencies**: None
   * **Provider**: Auto-determined (not configurable)
   * - Always `'local'`
   *
   * @defaultValue enabled: false
   */
  database?: BaseFeatureConfig

  /**
   * Session lifecycle management (internal).
   *
   * @remarks
   * **Dependencies**: None
   * **Provider**: Auto-determined (not configurable)
   * - Disabled in RESOURCE mode (CORE manages sessions)
   *
   * @defaultValue
   * - enabled: true (CORE/STANDALONE), false (RESOURCE)
   */
  sessionLifecycle?: BaseFeatureConfig
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
}

export type FrameworkFeatures = Record<FeatureName, FeatureContract>

export interface ResourceGrants {
  database?: boolean
  principal?: boolean
  auth?: boolean
}

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

export interface ServerRuntimeOptions {
  mode: FrameworkMode
  features: FrameworkFeatures
  coreResourceName: string
  resourceGrants?: ResourceGrants
  /** Development mode configuration (disabled in production) */
  devMode?: DevModeConfig
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
 * @example Minimal CORE Mode
 * ```typescript
 * Server.init({
 *   mode: 'CORE',
 *   features: {
 *     commands: { enabled: true },
 *     principal: { enabled: true },
 *   }
 * })
 * ```
 *
 * @example Minimal RESOURCE Mode
 * ```typescript
 * Server.init({
 *   mode: 'RESOURCE',
 *   coreResourceName: 'my-core',
 *   features: {
 *     commands: { enabled: true },  // Auto-uses 'core' provider
 *   }
 * })
 * ```
 *
 * @example STANDALONE Mode
 * ```typescript
 * Server.init({
 *   mode: 'STANDALONE',
 *   features: {
 *     players: { enabled: true },
 *     commands: { enabled: true },
 *   }
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
   * All features have sensible defaults. You only need to configure:
   * - `enabled: true` to enable a feature
   * - `provider` (optional, only for players/commands/principal/auth if you want non-default)
   * - `export: true` (optional, CORE mode only, for players/principal/chat)
   *
   * **Most features auto-determine their provider based on mode.**
   * Only configure `provider` if you need to override defaults.
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

  /** Resource grants configuration (CORE mode only) */
  resourceGrants?: ResourceGrants

  /** Development mode configuration (disabled in production) */
  devMode?: DevModeConfig
}

function createDefaultFeatures(mode: FrameworkMode): FrameworkFeatures {
  const scope = getFrameworkModeScope(mode)

  // Provider logic:
  // - CORE/STANDALONE: All features use 'local' (run locally)
  // - RESOURCE: Some features delegate to CORE ('core'), others run locally ('local')
  const playersProvider: FeatureProvider = mode === 'RESOURCE' ? 'core' : 'local'
  const commandsProvider: FeatureProvider = mode === 'RESOURCE' ? 'core' : 'local'
  const principalProvider: FeatureProvider = mode === 'RESOURCE' ? 'core' : 'local'
  const authProvider: FeatureProvider = mode === 'RESOURCE' ? 'core' : 'local'

  // These always use 'local' regardless of mode
  const netEventsProvider: FeatureProvider = 'local'
  const fiveMEventsProvider: FeatureProvider = 'local'
  const exportsProvider: FeatureProvider = 'local'
  const httpProvider: FeatureProvider = 'local'
  const chatProvider: FeatureProvider = 'local'
  const databaseProvider: FeatureProvider = 'local'
  const sessionLifecycleProvider: FeatureProvider = 'local'

  const sessionLifecycleEnabled = mode !== 'RESOURCE'

  // Features that should auto-export in CORE mode for RESOURCE access
  const commandsExport = mode === 'CORE'
  const playersExport = mode === 'CORE'
  const principalExport = mode === 'CORE'

  return {
    players: {
      enabled: true,
      provider: playersProvider,
      export: playersExport,
      scope,
      required: false,
    },
    netEvents: {
      enabled: true,
      provider: netEventsProvider,
      export: false,
      scope,
      required: false,
    },
    fiveMEvents: {
      enabled: sessionLifecycleEnabled,
      provider: fiveMEventsProvider,
      export: false,
      scope,
      required: false,
    },
    commands: {
      enabled: false,
      provider: commandsProvider,
      export: commandsExport,
      scope,
      required: false,
    },
    exports: { enabled: false, provider: exportsProvider, export: false, scope, required: false },
    http: { enabled: false, provider: httpProvider, export: false, scope, required: false },
    chat: { enabled: false, provider: chatProvider, export: false, scope, required: false },
    database: { enabled: false, provider: databaseProvider, export: false, scope, required: false },
    principal: {
      enabled: false,
      provider: principalProvider,
      export: principalExport,
      scope,
      required: false,
    },
    auth: { enabled: false, provider: authProvider, export: false, scope, required: false },
    sessionLifecycle: {
      enabled: sessionLifecycleEnabled,
      provider: sessionLifecycleProvider,
      export: false,
      scope,
      required: false,
    },
  }
}

export function resolveRuntimeOptions(options: ServerInitOptions): ServerRuntimeOptions {
  const defaults = createDefaultFeatures(options.mode)
  const features: FrameworkFeatures = { ...defaults }

  if (options.features) {
    for (const name of FEATURE_NAMES) {
      const override = options.features[name as keyof UserFeatureConfig]
      if (!override) continue
      features[name] = { ...defaults[name], ...override } as FeatureContract
    }
  }

  return {
    mode: options.mode,
    features,
    coreResourceName: options.coreResourceName ?? 'core',
    resourceGrants: options.resourceGrants,
    devMode: options.devMode,
  }
}

function assertFeatureKeys(features: any): asserts features is FrameworkFeatures {
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
      features.principal.provider === 'core' ||
      features.auth.provider === 'core')

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

  if (features.auth.enabled && mode === 'RESOURCE' && features.auth.provider !== 'core') {
    throw new Error(`[OpenCore] Feature 'auth' must use provider 'core' in RESOURCE mode`)
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
