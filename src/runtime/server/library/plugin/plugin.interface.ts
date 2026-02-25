import type { PluginInstallContext } from './plugin-context'

export interface OpenCorePlugin {
  /**
   * Unique plugin name.
   */
  readonly name: string

  /**
   * Called during OpenCore.init().
   */
  install(ctx: PluginInstallContext): void | Promise<void>

  /**
   * Called after platform capabilities and core services are ready.
   *
   * @remarks
   * Use this hook for runtime-dependent initialization (DI resolutions that
   * require platform adapters, starting timers, engine boot, etc).
   */
  start?(ctx: PluginInstallContext): void | Promise<void>
}
