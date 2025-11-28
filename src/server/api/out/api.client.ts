import { AppError, ErrorCode } from '../../../utils/errors'
import { ApiConfig } from '../../config/api.config'
import { Bind } from '../../decorators'
@Bind()
export class ApiClient {
  private readonly baseUrl: string
  private readonly timeoutMs: number
  private token: string | null = null

  constructor(private readonly config: ApiConfig) {
    this.baseUrl = config.baseUrl
    this.timeoutMs = config.timeoutMs
  }
  setToken(token: string) {
    this.token = token
  }

  async get<T = any>(endpoint: string): Promise<T> {
    try {
      const response = await this.fetchWithTimeout(this.baseUrl + endpoint, {
        method: 'GET',
        headers: this.buildHeaders(),
      })

      return this.handleResponse<T>(response, 'GET', endpoint)
    } catch (err) {
      if (err instanceof AppError) throw err

      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new AppError(
          'NETWORK_ERROR',
          `GET ${endpoint} timed out after ${this.timeoutMs}ms`,
          'external',
          { timeout: this.timeoutMs },
        )
      }

      throw new AppError('NETWORK_ERROR', `Network error calling GET ${endpoint}`, 'external', {
        endpoint,
        method: 'GET',
        cause: String(err),
      })
    }
  }

  async post<T = any>(endpoint: string, body: any): Promise<T> {
    try {
      const response = await fetch(this.baseUrl + endpoint, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      })

      return this.handleResponse<T>(response, 'POST', endpoint)
    } catch (err) {
      if (err instanceof AppError) throw err

      throw new AppError('NETWORK_ERROR', `POST ${endpoint} failed`, 'external', {
        endpoint,
        method: 'POST',
        body,
        cause: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async put<T = any>(endpoint: string, body: any): Promise<T> {
    try {
      const response = await fetch(this.baseUrl + endpoint, {
        method: 'PUT',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
      })

      return this.handleResponse<T>(response, 'PUT', endpoint)
    } catch (err) {
      if (err instanceof AppError) throw err

      throw new AppError('NETWORK_ERROR', `PUT ${endpoint} failed`, 'external', {
        endpoint,
        method: 'PUT',
        body,
        cause: err instanceof Error ? err.message : String(err),
      })
    }
  }

  private async handleResponse<T>(
    response: Response,
    method: string,
    endpoint: string,
  ): Promise<T> {
    if (!response.ok) {
      let code: ErrorCode = 'API_ERROR'
      let errorBody: unknown = null

      if (response.status === 401 || response.status === 403) {
        code = 'UNAUTHORIZED'
      }

      try {
        errorBody = await response.json()
      } catch (_) {}

      throw new AppError(
        code,
        `${method} ${endpoint} failed with status ${response.status}`,
        'external',
        {
          status: response.status,
          endpoint,
          method,
          body: errorBody,
        },
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(id)
    }
  }

  private buildHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.token) {
      headers['X-Identifier'] = this.token
    }

    return headers
  }
}
