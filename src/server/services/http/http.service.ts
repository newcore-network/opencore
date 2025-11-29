import { injectable } from 'tsyringe'
import { AppError, type ErrorCode } from '../../../utils'

export interface HttpOptions {
  headers?: Record<string, string>
  timeoutMs?: number
}

@injectable()
export class HttpService {
  /**
   * Performs an HTTP GET request to the specified URL.
   *
   * @template T - The expected return type of the response data.
   * @param url - The endpoint URL to fetch data from.
   * @param options - Optional configuration for the request (headers, timeout).
   * @returns A Promise that resolves to the response data of type T.
   * @throws {AppError} If the request fails, times out, or returns a non-2xx status code.
   */
  async get<T = any>(url: string, options: HttpOptions = {}): Promise<T> {
    return this.request<T>(url, 'GET', undefined, options)
  }

  /**
   * Performs an HTTP POST request to the specified URL with a JSON payload.
   *
   * @template T - The expected return type of the response data.
   * @param url - The endpoint URL to send data to.
   * @param body - The data payload to be sent as the request body (will be stringified to JSON).
   * @param options - Optional configuration for the request (headers, timeout).
   * @returns A Promise that resolves to the response data of type T.
   * @throws {AppError} If the request fails, times out, or returns a non-2xx status code.
   */
  async post<T = any>(url: string, body: any, options: HttpOptions = {}): Promise<T> {
    return this.request<T>(url, 'POST', body, options)
  }

  /**
   * Performs an HTTP PUT request to the specified URL to update a resource.
   *
   * @template T - The expected return type of the response data.
   * @param url - The endpoint URL to update.
   * @param body - The data payload to be sent as the request body (will be stringified to JSON).
   * @param options - Optional configuration for the request (headers, timeout).
   * @returns A Promise that resolves to the response data of type T.
   * @throws {AppError} If the request fails, times out, or returns a non-2xx status code.
   */
  async put<T = any>(url: string, body: any, options: HttpOptions = {}): Promise<T> {
    return this.request<T>(url, 'PUT', body, options)
  }

  /**
   * Performs an HTTP DELETE request to the specified URL.
   *
   * @template T - The expected return type of the response data (often void or the deleted entity).
   * @param url - The endpoint URL to delete the resource from.
   * @param options - Optional configuration for the request (headers, timeout).
   * @returns A Promise that resolves to the response data of type T.
   * @throws {AppError} If the request fails, times out, or returns a non-2xx status code.
   */
  async delete<T = any>(url: string, options: HttpOptions = {}): Promise<T> {
    return this.request<T>(url, 'DELETE', undefined, options)
  }

  private async request<T>(
    url: string,
    method: string,
    body: any | undefined,
    options: HttpOptions,
  ): Promise<T> {
    const { headers = {}, timeoutMs = 5000 } = options

    const finalHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    }

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        method,
        headers: finalHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      return await this.handleResponse<T>(response, method, url)
    } catch (err) {
      if (err instanceof AppError) throw err

      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new AppError(
          'NETWORK_ERROR',
          `${method} ${url} timed out after ${timeoutMs}ms`,
          'external',
          { timeout: timeoutMs },
        )
      }

      throw new AppError('NETWORK_ERROR', `Network error calling ${method} ${url}`, 'external', {
        endpoint: url,
        method,
        cause: err instanceof Error ? err.message : String(err),
      })
    } finally {
      clearTimeout(id)
    }
  }

  private async handleResponse<T>(response: Response, method: string, url: string): Promise<T> {
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
        `${method} ${url} failed with status ${response.status}`,
        'external',
        {
          status: response.status,
          endpoint: url,
          method,
          body: errorBody,
        },
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    try {
      return (await response.json()) as T
    } catch (_) {
      // TODO: define better behavior for non-JSON responses
      return undefined as T
    }
  }
}
