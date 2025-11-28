import type { ClassConstructor } from 'system/types'
import { Bind } from './bind'

type ServiceScope = 'singleton' | 'transient'

interface ServiceMeta {
  type: 'service'
  scope: ServiceScope
  module?: string
}

interface RepositoryMeta {
  type: 'repository'
  scope: ServiceScope
  entity?: string
}

const classRoles = new Map<Function, ServiceMeta | RepositoryMeta>()

export function getClassRoles() {
  return classRoles
}

export function Service(options?: { scope?: ServiceScope; module?: string }) {
  return function (target: ClassConstructor) {
    const scope = options?.scope ?? 'singleton'

    classRoles.set(target, {
      type: 'service',
      scope,
      module: options?.module,
    })

    Bind(scope)(target)
  }
}

export function Repository(options?: { scope?: ServiceScope; entity?: string }) {
  return function (target: ClassConstructor) {
    const scope = options?.scope ?? 'singleton'

    classRoles.set(target, {
      type: 'repository',
      scope,
      entity: options?.entity,
    })

    Bind(scope)(target)
  }
}
