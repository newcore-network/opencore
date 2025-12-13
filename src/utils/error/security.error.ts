import { type SecurityAction } from '../../server/types/security.types'
import { AppError } from './app.error'

export class SecurityError extends AppError {
  readonly action: SecurityAction

  constructor(action: SecurityAction, message: string, details?: unknown) {
    super('NETWORK_ERROR', message, 'core', details)
    this.action = action
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
