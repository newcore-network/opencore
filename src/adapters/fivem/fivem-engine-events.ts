import { IEngineEvents } from '../contracts/IEngineEvents'

export class FiveMEngineEvents extends IEngineEvents {
  on(eventName: string, handler?: (...args: any[]) => void): void {
    if (!handler) return

    on(eventName, (...args: any[]) => {
      if (eventName === 'playerJoining') {
        const clientId = Number(source)
        const license = GetPlayerIdentifier(clientId.toString(), 0) ?? undefined
        handler(clientId, { license })
        return
      }

      if (eventName === 'playerDropped') {
        const clientId = Number(source)
        handler(clientId)
        return
      }

      handler(...args)
    })
  }

  emit(eventName: string, ...args: any[]): void {
    emit(eventName, ...args)
  }
}
