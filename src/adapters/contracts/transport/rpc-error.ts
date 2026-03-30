export const PUBLIC_RPC_ERROR_MESSAGE = 'An internal server error occurred'

export type RpcErrorInfo = {
  message: string
  name?: string
}

type ExposedRpcError = {
  message: string
  name?: string
  expose: true
}

export class RpcPublicError extends Error {
  readonly expose = true

  constructor(message: string, name?: string) {
    super(message)
    if (name) {
      this.name = name
    }
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export function isExposedRpcError(error: unknown): error is ExposedRpcError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    'expose' in error &&
    error.expose === true
  )
}

export function serializeRpcError(error: unknown): RpcErrorInfo {
  if (isExposedRpcError(error)) {
    return {
      message: error.message,
      name: 'name' in error && typeof error.name === 'string' ? error.name : undefined,
    }
  }

  return { message: PUBLIC_RPC_ERROR_MESSAGE }
}
