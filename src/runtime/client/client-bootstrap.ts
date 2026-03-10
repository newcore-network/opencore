import { MetadataScanner } from '../../kernel/di/metadata.scanner'
import { loggers } from '../../kernel/logger'
import { createNodeClientAdapter } from './adapter/node-client-adapter'
import {
  assertClientAdapterCompatibility,
  getActiveClientAdapterName,
  getCurrentClientResourceName,
  installClientAdapter,
} from './adapter/registry'
import { di } from './client-container'
import {
  type ClientInitOptions,
  type ClientMode,
  getClientRuntimeContext,
  setClientRuntimeContext,
} from './client-runtime'
import { getClientControllerRegistry } from './decorators'
import {
  BlipService,
  Camera,
  CameraEffectsRegistry,
  Cinematic,
  MarkerService,
  NotificationService,
  PedService,
  ProgressService,
  ClientSessionBridgeService,
  SpawnService,
  StreamingService,
  TextUIService,
  VehicleClientService,
  VehicleService,
} from './services'
import { registerSystemClient } from './system/processors.register'
import { WebViewBridge } from './webview-bridge'

/**
 * Services that have an init() method which registers global runtime event listeners.
 *
 * These services are:
 * - Registered in DI for ALL modes (so they can be injected and used)
 * - Only initialized (.init() called) in CORE mode to avoid duplicate event handlers
 */
const SERVICES_WITH_GLOBAL_LISTENERS: Array<
  new (
    ...args: any[]
  ) => { init?: () => Promise<void> | void }
> = [SpawnService, ClientSessionBridgeService]

/**
 * All client services that should be available in the DI container
 */
// const ALL_CLIENT_SERVICES = [
//   SpawnService,
//   WebViewBridge,
//   NotificationService,
//   TextUIService,
//   ProgressService,
//   MarkerService,
//   BlipService,
//   VehicleClientService,
//   VehicleService,
//   PedService,
//   StreamingService,
// ] as const

/**
 * Register singleton services in the DI container
 *
 * @remarks
 * All services are registered in ALL modes so they can be injected and used.
 * However, only CORE mode will call .init() on services with global listeners.
 */
function registerServices() {
  // Register all client services in DI (available in all modes)
  if (!di.isRegistered(SpawnService)) di.registerSingleton(SpawnService, SpawnService)
  if (!di.isRegistered(WebViewBridge)) di.registerSingleton(WebViewBridge, WebViewBridge)
  if (!di.isRegistered(NotificationService))
    di.registerSingleton(NotificationService, NotificationService)
  if (!di.isRegistered(TextUIService)) di.registerSingleton(TextUIService, TextUIService)
  if (!di.isRegistered(ProgressService)) di.registerSingleton(ProgressService, ProgressService)
  if (!di.isRegistered(ClientSessionBridgeService))
    di.registerSingleton(ClientSessionBridgeService, ClientSessionBridgeService)
  if (!di.isRegistered(MarkerService)) di.registerSingleton(MarkerService, MarkerService)
  if (!di.isRegistered(BlipService)) di.registerSingleton(BlipService, BlipService)
  if (!di.isRegistered(Camera)) di.registerSingleton(Camera, Camera)
  if (!di.isRegistered(CameraEffectsRegistry))
    di.registerSingleton(CameraEffectsRegistry, CameraEffectsRegistry)
  if (!di.isRegistered(Cinematic)) di.registerSingleton(Cinematic, Cinematic)
  if (!di.isRegistered(VehicleClientService))
    di.registerSingleton(VehicleClientService, VehicleClientService)
  if (!di.isRegistered(VehicleService)) di.registerSingleton(VehicleService, VehicleService)
  if (!di.isRegistered(PedService)) di.registerSingleton(PedService, PedService)
  if (!di.isRegistered(StreamingService)) di.registerSingleton(StreamingService, StreamingService)
}

/**
 * Bootstrap services that need initialization
 *
 * @remarks
 * Only called in CORE mode to initialize services that register global event listeners.
 * This prevents duplicate event handlers when multiple resources use the framework.
 *
 * @param mode - The client initialization mode
 */
async function bootstrapServices(mode: ClientMode) {
  if (mode === 'CORE') {
    // Initialize services with global listeners (only in CORE mode)
    for (const Service of SERVICES_WITH_GLOBAL_LISTENERS) {
      const instance = di.resolve(Service)
      if (typeof (instance as any).init === 'function') {
        await (instance as any).init()
      }
    }

    // Instantiate VehicleClientService to register its event handlers
    di.resolve(VehicleClientService)
  }
}

async function tryImportAutoLoad() {
  try {
    await import('./.opencore/autoload.client.controllers')
  } catch (err) {
    if (err instanceof Error && err.message.includes('Cannot find module')) {
      loggers.bootstrap.debug(`[Bootstrap] No client controllers autoload file found, skipping.`)
      return
    }
    throw err
  }
}

/**
 * Initialize the client core framework
 *
 * @param options - Client initialization options
 */
export async function initClientCore(options: ClientInitOptions = {}) {
  const mode: ClientMode = options.mode ?? 'CORE'

  // Check if already initialized
  const existingContext = getClientRuntimeContext()
  if (existingContext?.isInitialized) {
    assertClientAdapterCompatibility(options.adapter)

    // Register system processors for the active bundle if needed.
    registerSystemClient()

    const resourceName = getCurrentClientResourceName()

    // If already initialized, only scan controllers for this resource
    if (mode === 'RESOURCE' || mode === 'STANDALONE') {
      await tryImportAutoLoad()
      const scanner = di.resolve(MetadataScanner)
      scanner.scan(getClientControllerRegistry(resourceName))
      loggers.bootstrap.info(`Resource "${resourceName}" controllers registered`)
      return
    }

    // If trying to initialize CORE mode twice, throw error
    throw new Error(
      `Client already initialized in ${existingContext.mode} mode by resource "${existingContext.resourceName}". Cannot initialize again in ${mode} mode.`,
    )
  }

  await installClientAdapter(options.adapter ?? createNodeClientAdapter())
  loggers.bootstrap.debug('Client adapter registered', {
    adapter: getActiveClientAdapterName() ?? 'unknown',
  })

  const resourceName = getCurrentClientResourceName()

  // Register system processors early (needed for MetadataScanner)
  // These processors are safe - they just process metadata, they don't register event handlers
  // Each resource bundle needs its own copy registered in its DI container
  registerSystemClient()

  // Set runtime context
  setClientRuntimeContext({
    mode,
    resourceName,
    isInitialized: true,
  })

  // Register all services in DI (available in all modes)
  registerServices()

  // Bootstrap services (only in CORE mode)
  // This is where services that register global event handlers are initialized
  await bootstrapServices(mode)

  // Import framework controllers (only in CORE mode)
  // These controllers listen to global events and should only be registered once
  if (mode === 'CORE') {
    await import('./controllers/spawner.controller')
    await import('./controllers/appearance.controller')
    await import('./controllers/player-sync.controller')
  }

  await tryImportAutoLoad()

  // Scan and register controllers
  const scanner = di.resolve(MetadataScanner)
  scanner.scan(getClientControllerRegistry(resourceName))

  loggers.bootstrap.info(`Client initialized in ${mode} mode`, { resourceName })
}
