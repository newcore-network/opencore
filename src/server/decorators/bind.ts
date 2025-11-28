import { injectable } from 'tsyringe'
import type { ClassConstructor } from '../../system/types'

type BindingScope = 'singleton' | 'transient'

interface BindingMeta {
  token: ClassConstructor
  useClass: ClassConstructor
  scope: BindingScope
}

const bindingRegistry: BindingMeta[] = []

export function getBindingRegistry() {
  return bindingRegistry
}

export function Bind(scope: BindingScope = 'singleton') {
  return function (target: any) {
    injectable()(target)

    bindingRegistry.push({
      token: target as ClassConstructor,
      useClass: target as ClassConstructor,
      scope,
    })
  }
}
