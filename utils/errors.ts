export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly origin: ErrorOrigin;

  constructor(code: ErrorCode, message: string, origin: ErrorOrigin, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
    this.origin = origin;
  }
}

export type ErrorCode =
  | 'PLAYER_NOT_FOUND'
  | 'INSUFFICIENT_FUNDS'
  | 'VALIDATION_ERROR'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'UNKNOWN';

export type ErrorOrigin = 'client' | 'server' | 'core' | 'external';
