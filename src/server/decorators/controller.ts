import { injectable } from 'tsyringe'
import type { ClassConstructor } from '../../system/class-constructor'
import { METADATA_KEYS } from '../system/metadata-server.keys'

export const serverControllerRegistry: ClassConstructor[] = []

export function Controller() {
  return function (target: ClassConstructor) {
    injectable()(target)
    Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, { type: 'server' }, target)
    serverControllerRegistry.push(target)
  }
}
