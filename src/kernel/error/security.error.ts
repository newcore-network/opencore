import { AppError } from './app.error'
import { SecurityAction } from './security.types'

export class SecurityError extends AppError {
  readonly action: SecurityAction

  constructor(action: SecurityAction, message: string, details?: unknown) {
    super('NETWORK:ERROR', message, 'core', details)
    this.action = action
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
