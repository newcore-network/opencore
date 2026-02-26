import type { ClientApi } from '../../client-api-runtime'

export interface PluginInstallContext {
  readonly client: ClientApi

  readonly di: {
    register(token: any, value: any): void
  }

  readonly config: {
    get<T = any>(key: string): T | undefined
  }
}
