import { Bind } from 'server/decorators'

export interface ApiModuleConfig {
  baseUrl: string
  timeoutMs: number
}

@Bind('singleton') // o @Config('core.api') si implementas el decorador
export class ApiConfig {
  private readonly config: ApiModuleConfig

  constructor() {
    const baseUrl = GetConvar('opencore_api_url', 'http://localhost:3000')
    const timeoutMs = Number(GetConvar('opencore_api_timeout', '5000'))

    this.config = { baseUrl, timeoutMs }
  }

  get baseUrl() {
    return this.config.baseUrl
  }

  get timeoutMs() {
    return this.config.timeoutMs
  }
}
