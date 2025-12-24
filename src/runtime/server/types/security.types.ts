export type SecurityAction = 'LOG' | 'WARN' | 'KICK' | 'BAN'

export interface SecurityViolation {
  code: string
  message: string
  action: SecurityAction
  details?: unknown
}
