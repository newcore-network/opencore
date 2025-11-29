import type { ClassConstructor } from '../../system/types'

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

const commandRegistry: CommandMeta[] = []

/**
 * Decorator used to mark a controller method as a command.
 * The metadata is collected and later bound to FiveM via RegisterCommand().
 *
 * @param name - The command name (e.g. "revive", "deposit")
 */
export function Command(nameOrOptions: string | CommandOptions) {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    const options = typeof nameOrOptions === 'string' ? { name: nameOrOptions } : nameOrOptions

    commandRegistry.push({
      ...options,
      methodName: propertyKey,
      target: target.constructor as ClassConstructor,
    })
  }
}

export function getCommandRegistry(): CommandMeta[] {
  return commandRegistry
}
