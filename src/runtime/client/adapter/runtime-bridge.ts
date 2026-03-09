/**
 * Runtime bridge owned by the active client adapter.
 */
export abstract class IClientRuntimeBridge {
  abstract getCurrentResourceName(): string
  abstract on(eventName: string, handler: (...args: any[]) => void | Promise<void>): void
  abstract registerCommand(
    commandName: string,
    handler: (...args: any[]) => void,
    restricted: boolean,
  ): void
  abstract registerKeyMapping(
    commandName: string,
    description: string,
    inputMapper: string,
    key: string,
  ): void
  abstract setTick(handler: () => void | Promise<void>): unknown
  abstract clearTick(handle: unknown): void
  abstract getGameTimer(): number
  abstract registerNuiCallback(
    eventName: string,
    handler: (data: any, cb: (response: unknown) => void) => void | Promise<void>,
  ): void
  abstract sendNuiMessage(message: string): void
  abstract setNuiFocus(hasFocus: boolean, hasCursor: boolean): void
  abstract setNuiFocusKeepInput(keepInput: boolean): void
  abstract registerExport(exportName: string, handler: (...args: any[]) => any): void
}
