export interface KeyMappingMeta {
  key: string;
  description: string;
  methodName: string;
  target: new (...args: any[]) => any;
}

const keyRegistry: KeyMappingMeta[] = [];

export function KeyMapping(key: string, description: string) {
  return (target: any, propertyKey: string) => {
    keyRegistry.push({
      key,
      description,
      methodName: propertyKey,
      target: target.constructor,
    });
  };
}

export function getKeyRegistry(): KeyMappingMeta[] {
  return keyRegistry;
}