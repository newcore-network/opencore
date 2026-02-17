import { SecurityError } from '../../../../kernel/error/security.error'

type ServerPlayer = { clientID: number }

export abstract class SecurityHandlerContract {
  abstract handleViolation(player: ServerPlayer, error: SecurityError): Promise<void>
}
