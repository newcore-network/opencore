import { IEngineEvents } from '../IEngineEvents'

export class FiveMEngineEvents extends IEngineEvents {
  on(eventName: string, handler: (...args: any[]) => void): void {
    on(eventName, handler)
  }
}
