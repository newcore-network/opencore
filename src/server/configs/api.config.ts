import { Bind } from '../decorators'
interface ApiConfigState {
  baseUrl: string
  timeoutMs: number
  headers: Record<string, string>
}

/**
 * Interface defining the Fluent API methods for configuring the API module.
 * This allows method chaining for a cleaner configuration syntax.
 */
export interface ApiConfigurator {
  /**
   * Sets the base URL for API requests.
   * @param url - The fully qualified base URL (e.g., "https://api.myserver.com").
   */
  baseUrl(url: string): this
  /**
   * Sets the default timeout for API requests.
   * @param ms - Timeout duration in milliseconds.
   */
  timeout(ms: number): this
  /**
   * Adds a default header to be included in every API request.
   * @param key - The HTTP header name (e.g., "Authorization").
   * @param value - The header value.
   */
  addHeader(key: string, value: string): this
}

/**
 * Configuration service for the Core API module.
 *
 * It follows a "Convention over Configuration" approach:
 * 1. By default, it loads values from FiveM Convars (`opencore_api_url`, `opencore_api_timeout`).
 * 2. It can be programmatically overridden using the `configure()` method.
 *
 * @scope Singleton
 */
@Bind('singleton')
export class ApiConfig {
  private state: ApiConfigState = {
    baseUrl: GetConvar('opencore_api_url', 'http://localhost:3000'),
    timeoutMs: Number(GetConvar('opencore_api_timeout', '5000')),
    headers: {},
  }

  /**
   * Applies programmatic configuration using a functional builder pattern.
   *
   * This method allows developers to override default settings or inject dynamic configuration
   * logic during the server startup phase.
   *
   * @example
   * ```ts
   * const apiConfig = di.resolve(ApiConfig);
   * apiConfig.configure(c =>
   * c.baseUrl('[https://api.production.com](https://api.production.com)')
   * .timeout(10000)
   * .addHeader('X-API-Key', 'secret')
   * );
   * ```
   *
   * @param configFn - A callback function that receives the configurator instance.
   */
  public configure(configFn: (config: ApiConfigurator) => void): void {
    const configurator = this.createConfigurator()
    configFn(configurator)
  }

  /**
   * Gets the currently configured Base URL.
   */
  get baseUrl() {
    return this.state.baseUrl
  }

  /**
   * Gets the configured timeout in milliseconds.
   */
  get timeoutMs() {
    return this.state.timeoutMs
  }

  /**
   * Gets a copy of the globally configured headers.
   */
  get headers() {
    return { ...this.state.headers }
  }

  private createConfigurator(): ApiConfigurator {
    return {
      baseUrl: (url: string) => {
        this.state.baseUrl = url
        return this.createConfigurator()
      },
      timeout: (ms: number) => {
        this.state.timeoutMs = ms
        return this.createConfigurator()
      },
      addHeader: (key: string, value: string) => {
        this.state.headers[key] = value
        return this.createConfigurator()
      },
    }
  }
}
