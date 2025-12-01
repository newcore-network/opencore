import { METADATA_KEYS } from '../system/metadata-server.keys'
import type { ClassConstructor } from '../../system/class-constructor'

export interface CommandOptions {
  name: string
  description?: string
  usage?: string
  permission?: string // e.g. "admin.revive"
}

export interface CommandMeta extends CommandOptions {
  methodName: string
  target: ClassConstructor
}

/**
 * Decorator used to mark a controller method as a command.
 * The metadata is collected and later bound to FiveM via RegisterCommand().
 *
 * @param name - The command name (e.g. "revive", "deposit")
 */
export function Command(nameOrOptions: string | CommandOptions) {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    const options = typeof nameOrOptions === 'string' ? { name: nameOrOptions } : nameOrOptions

    Reflect.defineMetadata(METADATA_KEYS.COMMAND, options, target, propertyKey)
  }
}
