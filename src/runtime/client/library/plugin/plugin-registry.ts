import type { PluginInstallContext } from './plugin-context'
import type { OpenCoreClientPlugin } from './plugin.interface'

export class PluginRegistry {
  private readonly installed = new Map<string, OpenCoreClientPlugin>()

  async installAll(plugins: OpenCoreClientPlugin[], ctx: PluginInstallContext): Promise<void> {
    for (const plugin of plugins) {
      if (this.installed.has(plugin.name)) {
        throw new Error(`Plugin "${plugin.name}" already installed`)
      }

      await plugin.install(ctx)
      this.installed.set(plugin.name, plugin)
    }
  }
}
