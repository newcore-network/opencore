import { Bind } from '../decorators'
import { createFluentConfigurator, FluentConfigurator } from './config.base'

interface ApiConfigState {
  baseUrl: string
  timeoutMs: number
}

/**
 * Extended configurator interface for API configuration.
 *
 * Extends the base fluent configurator with additional methods
 * specific to API configuration (like addHeader).
 */
export interface ApiConfigurator extends FluentConfigurator<ApiConfigState> {
  /**
   * Alias for timeoutMs - sets the timeout in milliseconds.
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
  }

  private _headers: Record<string, string> = {}

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
   *   c.baseUrl('https://api.production.com')
   *     .timeout(10000)
   *     .addHeader('X-API-Key', 'secret')
   * );
   * ```
   *
   * @param configFn - A callback function that receives the configurator instance.
   */
  public configure(configFn: (config: ApiConfigurator) => void): void {
    const baseConfigurator = createFluentConfigurator(this.state)

    // Extend with custom methods
    const configurator: ApiConfigurator = {
      ...baseConfigurator,
      timeout: (ms: number) => {
        this.state.timeoutMs = ms
        return configurator
      },
      addHeader: (key: string, value: string) => {
        this._headers[key] = value
        return configurator
      },
    }

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
    return { ...this._headers }
  }
}
