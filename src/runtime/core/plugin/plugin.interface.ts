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
}
