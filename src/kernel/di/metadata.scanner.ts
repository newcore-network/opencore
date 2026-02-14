import { injectAll, injectable } from 'tsyringe'
import { loggers } from '../logger'
import { type ClassConstructor } from './class-constructor'
import { GLOBAL_CONTAINER } from './container'
import { type DecoratorProcessor } from './decorator-processor'

@injectable()
export class MetadataScanner {
  constructor(@injectAll('DecoratorProcessor') private processors: DecoratorProcessor[]) {}

  public scan(registry: ClassConstructor[]) {
    loggers.scanner.info(
      `Scanning ${registry.length} controllers with ${this.processors.length} processors`,
    )

    for (const ControllerClass of registry) {
      let instance: any
      try {
        instance = GLOBAL_CONTAINER.resolve(ControllerClass)
      } catch (error) {
        loggers.scanner.error(
          `Failed to resolve controller '${ControllerClass.name}' during metadata scan`,
          {
            error: error instanceof Error ? error.message : String(error),
          },
        )
        continue
      }

      const prototype = Object.getPrototypeOf(instance)

      const methods = Object.getOwnPropertyNames(prototype).filter(
        (m) => m !== 'constructor' && typeof instance[m] === 'function',
      )

      for (const methodName of methods) {
        for (const processor of this.processors) {
          const metadata = Reflect.getMetadata(processor.metadataKey, prototype, methodName)

          if (metadata) {
            try {
              processor.process(instance, methodName, metadata)
            } catch (error) {
              loggers.scanner.error(
                `Failed processing metadata for '${ControllerClass.name}.${methodName}'`,
                {
                  processor: processor.constructor.name,
                  error: error instanceof Error ? error.message : String(error),
                },
              )
            }
          }
        }
      }
    }

    loggers.scanner.debug(`Metadata scan complete`)
  }
}
