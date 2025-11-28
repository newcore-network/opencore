import type { ClassConstructor } from "../../system/types";
import { injectable } from "tsyringe";

export const clientControllerRegistry: ClassConstructor[] = [];

export function ClientController() {
  return function (target: any) {
    injectable()(target);

    clientControllerRegistry.push(target as ClassConstructor);
  };
}
