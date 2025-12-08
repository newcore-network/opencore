import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Listen to FiveM events server-side, check the list below
 *
 * https://docs.fivem.net/docs/scripting-reference/events/server-events/
 */
export function OnFiveMEvent(event: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.FIVEM_EVENT, { event }, target, propertyKey)
  }
}
