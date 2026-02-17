import type { ServerApi } from '../../server.runtime'

export interface PluginInstallContext {
  readonly server: ServerApi

  readonly di: {
    register(token: any, value: any): void
  }

  readonly config: {
    get<T = any>(key: string): T | undefined
  }
}
