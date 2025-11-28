import { injectable } from 'tsyringe'
import { AppError, ErrorCode } from '../../../utils/errors'
@injectable()
export class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = GetConvar('api_url', 'http://localhost:3000')
  }

  setToken(token: string) {
    this.token = token
  }

  async get<T = any>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(this.baseUrl + endpoint, {
        method: 'GET',
        headers: this.buildHeaders(),
      })

      return this.handleResponse<T>(response, 'GET', endpoint)
    } catch (err) {
      if (err instanceof AppError) {
        throw err
      }

      throw new AppError('NETWORK_ERROR', `Network error calling GET ${endpoint}`, 'external', {
        endpoint,
        method: 'GET',
        cause: err instanceof Error ? err.message : String(err),
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
      if (err instanceof AppError) {
        throw err
      }

      throw new AppError('NETWORK_ERROR', `Network error calling POST ${endpoint}`, 'external', {
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
      if (err instanceof AppError) {
        throw err
      }

      throw new AppError('NETWORK_ERROR', `Network error calling PUT ${endpoint}`, 'external', {
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
      let errorBody: unknown

      if (response.status === 401 || response.status === 403) code = 'UNAUTHORIZED'

      try {
        errorBody = await response.json()
      } catch {
        errorBody = null
      }

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

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  private buildHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.token) {
      headers['X-Identifier'] = `${this.token}`
    }

    return headers
  }
}
