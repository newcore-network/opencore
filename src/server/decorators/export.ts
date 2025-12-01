import { METADATA_KEYS } from '../system/metadata-server.keys'

export function Export(name?: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(
      METADATA_KEYS.EXPORT,
      { exportName: name || propertyKey },
      target,
      propertyKey,
    )
  }
}
