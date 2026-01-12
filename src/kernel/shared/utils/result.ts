import { AppError } from './error/app.error'

export interface Ok<T> {
  ok: true
  value: T
}

export interface Err<E = AppError> {
  ok: false
  error: E
}

export type Result<T, E = AppError> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value }
}
export function err<E>(error: E): Err<E> {
  return { ok: false, error }
}
