import { IEngineEvents } from '../../adapters'
import { registerServerCapabilities } from '../../adapters/register-capabilities'
import { GLOBAL_CONTAINER, MetadataScanner } from '../../kernel/di/index'
import { loggers } from '../../kernel/logger'
import { PrincipalProviderContract } from './contracts/index'
import { DefaultPrincipalProvider } from './services/default/default-principal.provider'
import { getServerControllerRegistry } from './decorators/controller'
import {
  getFrameworkModeScope,
  type RuntimeContext,
  type ServerRuntimeOptions,
  setRuntimeContext,
  validateRuntimeOptions,
} from './runtime'
import { SessionRecoveryService } from './services/core/session-recovery.service'
import { registerServicesServer } from './services/services.register'
import { registerSystemServer } from './system/processors.register'

const CORE_WAIT_TIMEOUT = 10_000

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

  // Metadata scanning
  registerServicesServer(ctx)
  loggers.bootstrap.debug('Core services registered')
  registerSystemServer(ctx)
  loggers.bootstrap.debug('System processors registered')

  checkProviders(ctx)

  // In RESOURCE mode, verify CORE exports are available before loading controllers
  if (ctx.mode === 'RESOURCE') {
    const needsCoreExports =
      ctx.features.players.provider === 'core' ||
      ctx.features.commands.provider === 'core' ||
      ctx.features.principal.provider === 'core'

    if (needsCoreExports) {
      const { coreResourceName } = ctx

      loggers.bootstrap.debug(`Verifying CORE exports availability`, {
        coreResourceName,
        globalExportsKeys: Object.keys((globalThis as any).exports || {}),
      })

      // Build list of required exports
      const requiredExports: string[] = []
      if (ctx.features.commands.provider === 'core') {
        requiredExports.push('registerCommand', 'executeCommand', 'getAllCommands')
      }
      if (ctx.features.players.provider === 'core') {
        requiredExports.push(
          'getPlayerId',
          'getPlayerData',
          'getAllPlayersData',
          'getPlayerByAccountId',
          'getPlayerCount',
          'isPlayerOnline',
          'getPlayerMeta',
          'setPlayerMeta',
          'getPlayerStates',
          'hasPlayerState',
          'addPlayerState',
          'removePlayerState',
        )
      }
      if (ctx.features.principal.provider === 'core') {
        requiredExports.push(
          'getPrincipal',
          'getPrincipalByAccountId',
          'refreshPrincipal',
          'hasPermission',
          'hasRank',
          'hasAnyPermission',
          'hasAllPermissions',
          'getPermissions',
          'getRank',
          'getPrincipalName',
          'getPrincipalMeta',
        )
      }

      loggers.bootstrap.debug(`Checking CORE exports`, {
        coreResourceName,
        requiredExports,
      })

      // Access exports directly using FiveM's global exports object
      const globalExports = (globalThis as any).exports
      if (!globalExports) {
        throw new Error(
          `[OpenCore] FiveM 'exports' global not found. This should never happen in a FiveM environment.`,
        )
      }

      const coreExports = globalExports[coreResourceName]

      // Check each required export directly (can't use Object.keys on FiveM exports proxy)
      const missingExports: string[] = []
      for (const exportName of requiredExports) {
        try {
          const exportValue = coreExports?.[exportName]
          if (typeof exportValue !== 'function') {
            missingExports.push(exportName)
            loggers.bootstrap.warn(`Export '${exportName}' is not a function`, {
              exportName,
              type: typeof exportValue,
              value: exportValue,
            })
          }
        } catch (error) {
          missingExports.push(exportName)
          loggers.bootstrap.warn(`Failed to access export '${exportName}'`, {
            exportName,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      if (missingExports.length > 0) {
        const errorMsg =
          `CORE resource '${coreResourceName}' is missing ${missingExports.length} required exports: ${missingExports.join(', ')}\n` +
          `\n` +
          `This usually means:\n` +
          `  1. The CORE resource failed to initialize properly\n` +
          `  2. The CORE resource doesn't have the 'exports' feature enabled\n` +
          `  3. The CORE resource doesn't have the required features enabled (commands: ${ctx.features.commands.provider === 'core'})\n` +
          `\n` +
          `Verify in '${coreResourceName}/src/server/server.ts':\n` +
          `  - mode: 'CORE'\n` +
          `  - features.exports.enabled: true\n` +
          `  - features.commands.enabled: true (if using commands)`
        loggers.bootstrap.fatal(errorMsg)
        throw new Error(`[OpenCore] ${errorMsg}`)
      }
    }
  }

  await loadFrameworkControllers(ctx)

  const scanner = GLOBAL_CONTAINER.resolve(MetadataScanner)
  scanner.scan(getServerControllerRegistry())

  // Initialize DevMode if enabled
  if (ctx.devMode?.enabled) {
    await initDevMode(ctx.devMode)
  }

  // Run session recovery if enabled (recovers sessions for players already connected)
  if (ctx.features.sessionLifecycle.enabled && ctx.features.sessionLifecycle.recoveryOnRestart) {
    runSessionRecovery()
  }

  loggers.bootstrap.info('OpenCore Server initialized successfully')

  if (ctx.mode === 'CORE' && GLOBAL_CONTAINER.isRegistered(IEngineEvents as any)) {
    const engineInterface = GLOBAL_CONTAINER.resolve(IEngineEvents as any) as IEngineEvents
    engineInterface.emit('core:ready')
  }
}

function createCoreDependency(coreName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false
    const engineEvents = GLOBAL_CONTAINER.resolve(IEngineEvents as any) as IEngineEvents

    const cleanup = () => {
      resolved = true
      clearTimeout(timeout)
    }

    const timeout = setTimeout(() => {
      if (!resolved) {
        reject(
          new Error(
            `[OpenCore] Timeout waiting for CORE '${coreName}'. The Core did not emit 'core:ready' within ${CORE_WAIT_TIMEOUT}ms.`,
          ),
        )
      }
    }, CORE_WAIT_TIMEOUT)

    const onReady = () => {
      if (!resolved) {
        cleanup()
        resolve()
      }
    }

    engineEvents.on('core:ready', onReady)
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
    hotReload: config.hotReload,
    bridge: config.bridge,
    interceptor: config.interceptor,
    simulator: config.simulator,
  })
}
