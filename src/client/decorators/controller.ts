import { injectable } from 'tsyringe'
import type { ClassConstructor } from '../../system/class-constructor'
import { METADATA_KEYS } from '../system/metadata-client.keys'

export const clientControllerRegistry: ClassConstructor[] = []

export function Controller() {
  return function (target: ClassConstructor) {
    injectable()(target)
    Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, { type: 'client' }, target)
    clientControllerRegistry.push(target)
  }
}
