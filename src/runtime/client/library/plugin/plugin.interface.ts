import type { PluginInstallContext } from './plugin-context'

export interface OpenCoreClientPlugin {
  /**
   * Unique plugin name.
   */
  readonly name: string

  /**
   * Called during Client.init().
   */
  install(ctx: PluginInstallContext): void | Promise<void>
}
