import { injectable, Lifecycle, scoped, singleton } from 'tsyringe'

export type BindingScope = 'singleton' | 'transient'
type Constructable = new (...args: any[]) => unknown

export function bindClass(target: Constructable, scope: BindingScope = 'singleton'): void {
  injectable()(target)

  if (scope === 'singleton') {
    singleton()(target)
    return
  }

  scoped(Lifecycle.ResolutionScoped)(target)
}

export function createBindingDecorator(scope: BindingScope = 'singleton') {
  return (target: Constructable) => {
    bindClass(target, scope)
  }
}

export function createServiceDecorator(options?: { scope?: BindingScope }) {
  return createBindingDecorator(options?.scope ?? 'singleton')
}
