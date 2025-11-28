import { ClassConstructor } from '@core/utils/types/_system-types_';
import { injectable } from 'tsyringe';

export const clientControllerRegistry: ClassConstructor[] = [];

export function ClientController() {
  return function (target: any) {
    injectable()(target);

    clientControllerRegistry.push(target as ClassConstructor);
  };
}
