import { METADATA_KEYS } from '../system/metadata-server.keys'
import type { ClassConstructor } from '../../system/class-constructor'
import type z from 'zod'

export interface CommandConfig {
  name: string
  description?: string
  usage?: string
  permission?: string
  schema?: z.ZodType
}

export interface CommandMetadata extends CommandConfig {
  methodName: string
  target: ClassConstructor
}

/**
 * Decorator used to mark a controller method as a command.
 * The metadata is collected and later bound to FiveM via RegisterCommand().
 *
 * @param name - The command name (e.g. "revive", "deposit")
 */
export function Command(configOrName: string | CommandConfig) {
  return (target: any, propertyKey: string) => {
    // Normalizamos: si pasa solo un string, creamos el objeto config
    const config: CommandConfig =
      typeof configOrName === 'string' ? { name: configOrName } : configOrName

    const metadata: CommandMetadata = {
      ...config,
      methodName: propertyKey,
      target: target.constructor,
    }

    Reflect.defineMetadata(METADATA_KEYS.COMMAND, metadata, target, propertyKey)
  }
}
