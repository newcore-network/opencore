import { IEngineEvents } from '../../adapters'
import { registerServerCapabilities } from '../../adapters/register-capabilities'
import { EventsAPI } from '../../adapters/contracts/transport/events.api'
import { GLOBAL_CONTAINER, MetadataScanner } from '../../kernel/di/index'
import { getLogLevel, LogLevelLabels, loggers } from '../../kernel/logger'
import { PrincipalProviderContract } from './contracts/index'
import { BinaryServiceMetadata, getServerBinaryServiceRegistry } from './decorators/binaryService'
import { getServerControllerRegistry } from './decorators/controller'
import {
  getFrameworkModeScope,
  type RuntimeContext,
  type ServerRuntimeOptions,
  setRuntimeContext,
  validateRuntimeOptions,
} from './runtime'
import { BinaryProcessManager } from './system/managers/binary-process.manager'
import { SessionRecoveryService } from './services/session-recovery.local'
import { registerServicesServer } from './services/services.register'
import { METADATA_KEYS } from './system/metadata-server.keys'
import { registerSystemServer } from './system/processors.register'

const CORE_WAIT_TIMEOUT = 10000

function checkProviders(ctx: RuntimeContext): void {
  if (ctx.mode === 'RESOURCE') return

  if (ctx.features.principal.enabled) {
    if (!GLOBAL_CONTAINER.isRegistered(PrincipalProviderContract as any)) {
      const errorMsg =
        'No Principal Provider configured. ' +
        "Please call 'Server.setPrincipalProvider(YourProvider)' before init(). This is required for authorization."
      loggers.bootstrap.fatal(errorMsg)
      throw new Error(`[OpenCore] CRITICAL: ${errorMsg}`)
    }
  }
}

async function loadFrameworkControllers(ctx: RuntimeContext): Promise<void> {
  if (ctx.features.commands.enabled) {
    if (ctx.mode === 'RESOURCE') {
      // RESOURCE mode: only load the controller that receives delegated commands from CORE
      await import('./controllers/remote-command-execution.controller')
    } else {
      // CORE/STANDALONE mode: load the unified command controller
      // This handles both network events and exports in a single controller
      await import('./controllers/command-export.controller')
    }
  }

  if (ctx.features.chat.enabled && ctx.features.chat.export && ctx.features.exports.enabled) {
    if (ctx.mode !== 'RESOURCE') {
      await import('./controllers/chat.controller')
    }
  }

  if (ctx.features.sessionLifecycle.enabled && ctx.mode !== 'RESOURCE') {
    await import('./controllers/session.controller')
  }

  if (ctx.features.players.enabled && ctx.features.players.export && ctx.features.exports.enabled) {
    await import('./controllers/player-export.controller')
  }

  if (ctx.features.chat.enabled && ctx.features.exports.enabled && ctx.mode === 'CORE') {
    await import('./controllers/channel.controller')
  }

  if (ctx.mode === 'CORE') {
    await import('./controllers/ready.controller')
  }

  if (
    ctx.features.principal.enabled &&
    ctx.features.principal.export &&
    ctx.features.exports.enabled
  ) {
    await import('./controllers/principal-export.controller')
  }
}

/**
 * Bootstraps the OpenCore Server Application Context.
 *
 * This is the primary entry point for the server-side framework. It orchestrates the
 * initialization of the Dependency Injection (DI) container and establishes the
 * bridge between the low-level FiveM runtime and the OpenCore architecture.
 *
 * **Initialization Lifecycle:**
 * 1. **Infrastructure Registration:** Registers core infrastructure services (`PlayerService`, `CommandService`, `HttpService`) as Singletons in the IoC container.
 * 2. **Reflection & Discovery:** Scans all decorated classes (Controllers, Services) to extract metadata defined by `@Command`, `@OnNet`, etc.
 * 3. **Runtime Binding:** Binds the discovered metadata to actual FiveM natives (e.g., `RegisterCommand`, `onNet`, `exports`).
 * 4. **Session Management:** Activates the player session tracking system.
 *
 * @returns A promise that resolves when the Core is fully initialized and ready to process events.
 */
export async function initServer(options: ServerRuntimeOptions) {
  validateRuntimeOptions(options)
  setRuntimeContext(options)

  const ctx: RuntimeContext = options
  loggers.bootstrap.info('Initializing OpenCore Server...')

  loggers.bootstrap.debug('Runtime configuration', {
    mode: ctx.mode,
    scope: getFrameworkModeScope(ctx.mode),
  })

  // Register platform-specific capabilities (adapters)
  await registerServerCapabilities()
  loggers.bootstrap.debug('Platform capabilities registered')

  const dependenciesToWaitFor: Promise<any>[] = []
  if (ctx.mode === 'RESOURCE') {
    loggers.bootstrap.info(`[WAIT] Standing by for Core '${ctx.coreResourceName}' to be ready...`)
    dependenciesToWaitFor.push(createCoreDependency(ctx.coreResourceName))
  }

  if (options.onDependency?.waitFor) {
    const userDeps = Array.isArray(options.onDependency.waitFor)
      ? options.onDependency.waitFor
      : [options.onDependency.waitFor]
    dependenciesToWaitFor.push(...userDeps)
  }

  if (dependenciesToWaitFor.length > 0 || options.onDependency?.onReady) {
    await dependencyResolver(dependenciesToWaitFor, options.onDependency?.onReady)
  }

  if (ctx.mode === 'RESOURCE') {
    loggers.bootstrap.info(`Core ready detected!`)
  }
  loggers.bootstrap.debug('Dependencies resolved. Proceeding with system boot.')

  // 1. Register Core Services (WorldContext, PlayerService, etc.)
  registerServicesServer(ctx)
  loggers.bootstrap.debug('Core services registered')

  // 2. Load Controllers (Framework & User controllers)
  // This is where user services get registered if they are decorated with @injectable()
  // and imported before init() or discovered here.
  await loadFrameworkControllers(ctx)
  loggers.bootstrap.debug('Frameworks Controllers loaded')
  await tryImportAutoLoad()
  loggers.bootstrap.debug('User Controllers loaded')

  // 3. Register System Processors (Command, NetEvent, etc.)
  // These processors check if contracts are already registered before applying defaults.
  registerSystemServer(ctx)
  loggers.bootstrap.debug('System processors registered')

  checkProviders(ctx)

  const scanner = GLOBAL_CONTAINER.resolve(MetadataScanner)
  scanner.scan(getServerControllerRegistry())

  const binaryServices = getServerBinaryServiceRegistry()
  for (const serviceClass of binaryServices) {
    const metadata = Reflect.getMetadata(METADATA_KEYS.BINARY_SERVICE, serviceClass) as
      | BinaryServiceMetadata
      | undefined
    if (!metadata) continue
    const manager = GLOBAL_CONTAINER.resolve(BinaryProcessManager)
    try {
      manager.register(metadata, metadata.serviceClass)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      loggers.bootstrap.error(`[BinaryService] Failed to register ${metadata.name}`, {
        error: message,
      })
    }
  }

  // Initialize DevMode if enabled
  if (ctx.devMode?.enabled) {
    await initDevMode(ctx.devMode)
  }

  // Run session recovery if enabled (recovers sessions for players already connected)
  if (ctx.features.sessionLifecycle.enabled && ctx.features.sessionLifecycle.recoveryOnRestart) {
    runSessionRecovery()
  }

  loggers.bootstrap.info('OpenCore Server initialized successfully')

  if (
    ctx.mode === 'CORE' &&
    GLOBAL_CONTAINER.isRegistered(IEngineEvents as any) &&
    GLOBAL_CONTAINER.isRegistered(EventsAPI as any)
  ) {
    const engineEvents = GLOBAL_CONTAINER.resolve(IEngineEvents as any) as IEngineEvents
    const events = GLOBAL_CONTAINER.resolve(EventsAPI as any) as EventsAPI

    // 1. Broadast to resources already running
    engineEvents.emit('core:ready')
    events.emit('core:ready', 'all')

    // 2. Listen for 'core:request-ready' for resources starting late (hot-reload)
    engineEvents.on('core:request-ready', () => {
      engineEvents.emit('core:ready')
    })

    loggers.bootstrap.info(`'core:ready' logic initialized and broadcasted`)
  }

  const logLevelLabel = LogLevelLabels[getLogLevel()]
  loggers.bootstrap.info(`LogLevel Setted: ${logLevelLabel}`)
}

function createCoreDependency(coreName: string): Promise<void> {
  loggers.bootstrap.debug(`Setting up detection mechanisms for Core '${coreName}'...`)
  return new Promise((resolve, reject) => {
    let resolved = false
    let pollingInterval: ReturnType<typeof setInterval> | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    const engineEvents = GLOBAL_CONTAINER.resolve(IEngineEvents as any) as IEngineEvents

    const cleanup = () => {
      resolved = true
      if (timeout) clearTimeout(timeout)
      if (pollingInterval) clearInterval(pollingInterval)
    }

    // 1. Register listener FIRST (before any requests)
    const onReady = () => {
      if (!resolved) {
        loggers.bootstrap.debug(`Core '${coreName}' detected via 'core:ready' event!`)
        cleanup()
        resolve()
      }
    }
    engineEvents.on('core:ready', onReady)
    loggers.bootstrap.debug(`Listening for 'core:ready' event from Core`)

    // 2. Check if already ready via export (Polling)
    const checkReady = () => {
      if (resolved) return
      try {
        const globalExports = (globalThis as any).exports
        const isReady = globalExports?.[coreName]?.isCoreReady?.()
        loggers.bootstrap.debug(`Polling isCoreReady export: ${isReady}`)
        if (isReady === true) {
          loggers.bootstrap.debug(`Core '${coreName}' detected via isCoreReady export!`)
          cleanup()
          resolve()
        }
      } catch (e) {
        loggers.bootstrap.debug(`Export check failed: ${e}`)
      }
    }

    pollingInterval = setInterval(checkReady, 500)
    checkReady() // Initial check

    // 3. Request status (for hot-reload cases where Core is already up)
    // This is sent AFTER registering the listener so we can receive the response
    if (!resolved) {
      loggers.bootstrap.debug(`Requesting Core status via 'core:request-ready' event`)
      engineEvents.emit('core:request-ready')
    }

    // 4. Timeout protection
    timeout = setTimeout(() => {
      if (!resolved) {
        loggers.bootstrap.warn(
          `Timeout waiting for Core '${coreName}' after ${CORE_WAIT_TIMEOUT}ms`,
        )
        cleanup()
        reject(
          new Error(
            `[OpenCore] Timeout waiting for CORE '${coreName}'. The Core did not emit 'core:ready' or expose 'isCoreReady' within ${CORE_WAIT_TIMEOUT}ms.`,
          ),
        )
      }
    }, CORE_WAIT_TIMEOUT)
  })
}

async function dependencyResolver(
  waitFor?: Promise<any> | Promise<any>[],
  onReady?: () => Promise<void> | void,
): Promise<void> {
  if (waitFor) {
    const dependencyPromises = Array.isArray(waitFor) ? waitFor : [waitFor]
    try {
      await Promise.all(dependencyPromises)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      loggers.bootstrap.fatal(`Failed to resolve startup dependencies`, { error: msg })
      throw new Error(`[OpenCore] Startup aborted: ${msg}`)
    }
  }

  if (onReady) {
    try {
      await onReady()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      loggers.bootstrap.fatal('Failed to execute onReady hook', { error: msg })
      throw new Error(`[OpenCore] onReady hook failed: ${msg}`)
    }
  }
}

async function tryImportAutoLoad() {
  try {
    await import('./.opencore/autoload.server.controllers')
  } catch (err) {
    if (err instanceof Error && err.message.includes('Cannot find module')) {
      loggers.bootstrap.warn(`[Bootstrap] No server controllers autoload file found, skipping.`)
      return
    }
    throw err
  }
}

/**
 * Runs session recovery to restore sessions for players already connected.
 *
 * @remarks
 * This is useful during development when hot-reloading resources.
 * Players remain connected to FiveM but lose their sessions when the resource restarts.
 * This function detects these orphaned players and recreates their sessions.
 */
function runSessionRecovery(): void {
  try {
    const recoveryService = GLOBAL_CONTAINER.resolve(SessionRecoveryService)
    const stats = recoveryService.recoverSessions()

    if (stats.recovered > 0) {
      loggers.bootstrap.info(`[SessionRecovery] Recovered ${stats.recovered} player session(s)`)
    }
  } catch (error) {
    loggers.bootstrap.warn('[SessionRecovery] Failed to run session recovery', {
      error: (error as Error).message,
    })
  }
}

/**
 * Initializes the DevMode subsystem.
 * This is loaded dynamically to avoid bundling dev tools in production.
 */
async function initDevMode(config: NonNullable<RuntimeContext['devMode']>): Promise<void> {
  const { DevModeService } = await import('./devmode/dev-mode.service')
  const { EventInterceptorService } = await import('./devmode/event-interceptor.service')
  const { StateInspectorService } = await import('./devmode/state-inspector.service')
  const { PlayerSimulatorService } = await import('./devmode/player-simulator.service')

  // Register DevMode services
  GLOBAL_CONTAINER.registerSingleton(EventInterceptorService, EventInterceptorService)
  GLOBAL_CONTAINER.registerSingleton(StateInspectorService, StateInspectorService)
  GLOBAL_CONTAINER.registerSingleton(PlayerSimulatorService, PlayerSimulatorService)
  GLOBAL_CONTAINER.registerSingleton(DevModeService, DevModeService)

  // Enable DevMode
  const devModeService = GLOBAL_CONTAINER.resolve(DevModeService)
  await devModeService.enable({
    enabled: true,
    bridge: config.bridge,
    interceptor: config.interceptor,
    simulator: config.simulator,
  })
}
