import { IEngineEvents } from '../contracts/IEngineEvents'

export class FiveMEngineEvents extends IEngineEvents {
  on(eventName: string, handler?: (...args: any[]) => void): void {
    if (handler) on(eventName, handler)
    else on(eventName, () => {}) // empty handler
  }

  emit(eventName: string, ...args: any[]): void {
    emit(eventName, ...args)
  }
}
