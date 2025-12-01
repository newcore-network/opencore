import { Bind } from './bind'
import type { BindingScope } from './bind'

export function Service(options?: { scope?: BindingScope }) {
  return Bind(options?.scope ?? 'singleton')
}

export function Repository(options?: { scope?: BindingScope }) {
  return Bind(options?.scope ?? 'singleton')
}
