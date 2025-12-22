import { injectable, Lifecycle, scoped, singleton } from 'tsyringe'

export type BindingScope = 'singleton' | 'transient'

export function Bind(scope: BindingScope = 'singleton') {
  return function (target: any) {
    injectable()(target)

    if (scope === 'singleton') {
      singleton()(target)
    } else {
      scoped(Lifecycle.ResolutionScoped)(target)
    }
  }
}
