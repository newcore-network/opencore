import { ClassConstructor } from '../../utils/types/_system-types_';

export interface CommandMeta {
  name: string;
  methodName: string;
  target: ClassConstructor;
}

const commandRegistry: CommandMeta[] = [];

/**
 * Decorator used to mark a controller method as a command.
 * The metadata is collected and later bound to FiveM via RegisterCommand().
 *
 * @param name - The command name (e.g. "revive", "deposit")
 */
export function Command(name: string) {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    commandRegistry.push({
      name,
      methodName: propertyKey,
      target: target.constructor as ClassConstructor,
    });
  };
}

export function getCommandRegistry(): CommandMeta[] {
  return commandRegistry;
}
