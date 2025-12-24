export abstract class IExports {
  abstract register(exportName: string, handler: (...args: any[]) => any): void
  abstract getResource<T = any>(resourceName: string): T | undefined
}
