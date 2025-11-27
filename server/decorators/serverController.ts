import { ClassConstructor } from '@core/utils/types/_system-types_';
import { injectable } from 'tsyringe';

export const serverControllerRegistry: ClassConstructor[] = [];

export function ServerController() {
  return function (target: any) {
    injectable()(target);

    serverControllerRegistry.push(target as ClassConstructor);
  };
}
