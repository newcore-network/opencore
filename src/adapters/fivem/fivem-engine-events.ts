import { IEngineEvents } from '../contracts/IEngineEvents'

export class FiveMEngineEvents extends IEngineEvents {
  on(eventName: string, handler: (...args: any[]) => void): void {
    on(eventName, handler)
  }

  emit(eventName: string, ...args: any[]): void {
    emit(eventName, ...args)
  }
}
