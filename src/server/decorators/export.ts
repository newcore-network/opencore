import type { ClassConstructor } from '../../system/types'

export interface ExportMeta {
  exportName: string
  methodName: string
  target: ClassConstructor
}

const exportRegistry: ExportMeta[] = []

export function Export(name?: string) {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    exportRegistry.push({
      exportName: name || propertyKey,
      methodName: propertyKey,
      target: target.constructor as ClassConstructor,
    })
  }
}

export function getExportRegistry() {
  return exportRegistry
}
