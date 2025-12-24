export abstract class IEngineEvents {
  abstract on(eventName: string, handler: (...args: any[]) => void): void
}
