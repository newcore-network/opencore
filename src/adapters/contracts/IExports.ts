export abstract class IExports {
  abstract register(exportName: string, handler: (...args: unknown[]) => unknown): void
  abstract getResource<T = unknown>(resourceName: string): T | undefined
}
