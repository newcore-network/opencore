import { injectable } from "tsyringe";
import type { ClassConstructor } from "../../system/types";

interface BindingMeta {
  token: ClassConstructor;
  useClass: ClassConstructor;
}

const bindingRegistry: BindingMeta[] = [];

export function getBindingRegistry() {
  return bindingRegistry;
}

export function Bind() {
  return function (target: any) {
    injectable()(target);

    bindingRegistry.push({
      token: target as ClassConstructor,
      useClass: target as ClassConstructor,
    });
  };
}
