import type { ClassConstructor } from '../../system/types'
import { injectable } from 'tsyringe'

export const serverControllerRegistry: ClassConstructor[] = []

export function Controller() {
  return function (target: any) {
    injectable()(target)

    serverControllerRegistry.push(target as ClassConstructor)
  }
}
