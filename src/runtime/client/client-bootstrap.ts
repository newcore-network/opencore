import { MetadataScanner } from '../../kernel/di/metadata.scanner'
import { di } from './client-container'
import {
  type ClientInitOptions,
  type ClientMode,
  getClientRuntimeContext,
  setClientRuntimeContext,
} from './client-runtime'
import { getClientControllerRegistry } from './decorators'
import { playerClientLoader } from './player/player.loader'
import {
  BlipService,
  MarkerService,
  NotificationService,
  PedService,
  ProgressService,
  SpawnService,
  StreamingService,
  TextUIService,
  VehicleService,
} from './services'
import { registerSystemClient } from './system/processors.register'
import { NuiBridge } from './ui-bridge'

/**
 * Services that have an init() method which registers global FiveM event listeners.
 *
 * These services are:
 * - Registered in DI for ALL modes (so they can be injected and used)
 * - Only initialized (.init() called) in CORE mode to avoid duplicate event handlers
 */
const SERVICES_WITH_GLOBAL_LISTENERS = [SpawnService] as const

/**
 * All client services that should be available in the DI container
 */
const ALL_CLIENT_SERVICES = [
  SpawnService,
  NuiBridge,
  NotificationService,
  TextUIService,
  ProgressService,
  MarkerService,
  BlipService,
  VehicleService,
  PedService,
  StreamingService,
] as const

/**
 * Get current resource name safely
 */
function getCurrentResourceNameSafe(): string {
  const fn = (globalThis as any).GetCurrentResourceName
  if (typeof fn === 'function') {
    const name = fn()
    if (typeof name === 'string' && name.trim()) return name
  }
  return 'default'
}

/**
 * Register singleton services in the DI container
 *
 * @remarks
 * All services are registered in ALL modes so they can be injected and used.
 * However, only CORE mode will call .init() on services with global listeners.
 */
function registerServices() {
  // Register all client services in DI (available in all modes)
  di.registerSingleton(SpawnService, SpawnService)
  di.registerSingleton(NuiBridge, NuiBridge)
  di.registerSingleton(NotificationService, NotificationService)
  di.registerSingleton(TextUIService, TextUIService)
  di.registerSingleton(ProgressService, ProgressService)
  di.registerSingleton(MarkerService, MarkerService)
  di.registerSingleton(BlipService, BlipService)
  di.registerSingleton(VehicleService, VehicleService)
  di.registerSingleton(PedService, PedService)
  di.registerSingleton(StreamingService, StreamingService)
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
  }
}

/**
 * Initialize the client core framework
 *
 * @param options - Client initialization options
 */
export async function initClientCore(options: ClientInitOptions = {}) {
  const mode: ClientMode = options.mode ?? 'CORE'
  const resourceName = getCurrentResourceNameSafe()

  // Register system processors early (needed for MetadataScanner)
  // These processors are safe - they just process metadata, they don't register event handlers
  // Each resource bundle needs its own copy registered in its DI container
  registerSystemClient()

  // Check if already initialized
  const existingContext = getClientRuntimeContext()
  if (existingContext?.isInitialized) {
    // If already initialized, only scan controllers for this resource
    if (mode === 'RESOURCE' || mode === 'STANDALONE') {
      const scanner = di.resolve(MetadataScanner)
      scanner.scan(getClientControllerRegistry(resourceName))
      console.log(`[OpenCore Client] Resource "${resourceName}" controllers registered`)
      return
    }

    // If trying to initialize CORE mode twice, throw error
    throw new Error(
      `Client already initialized in ${existingContext.mode} mode by resource "${existingContext.resourceName}". Cannot initialize again in ${mode} mode.`,
    )
  }

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

  // Player loader (only in CORE mode)
  if (mode === 'CORE') {
    playerClientLoader()
  }

  // Import framework controllers (only in CORE mode)
  // These controllers listen to global events and should only be registered once
  if (mode === 'CORE') {
    await import('./controllers/spawner.controller')
  }

  // Scan and register controllers
  const scanner = di.resolve(MetadataScanner)
  scanner.scan(getClientControllerRegistry(resourceName))

  console.log(`[OpenCore Client] Initialized in ${mode} mode (resource: ${resourceName})`)
}
