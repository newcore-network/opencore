export interface DecoratorProcessor {
  readonly metadataKey: string
  process(target: any, methodName: string, metadata: any): void
}
