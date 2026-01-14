import { container, injectAll, injectable } from 'tsyringe'
import { loggers } from '../logger'
import { type ClassConstructor, type DecoratorProcessor } from './index'

@injectable()
export class MetadataScanner {
  constructor(@injectAll('DecoratorProcessor') private processors: DecoratorProcessor[]) {}

  public scan(registry: ClassConstructor[]) {
    loggers.scanner.info(
      `Scanning ${registry.length} controllers with ${this.processors.length} processors`,
    )

    for (const ControllerClass of registry) {
      const instance = container.resolve(ControllerClass)
      const prototype = Object.getPrototypeOf(instance)

      const methods = Object.getOwnPropertyNames(prototype).filter(
        (m) => m !== 'constructor' && typeof instance[m] === 'function',
      )

      for (const methodName of methods) {
        for (const processor of this.processors) {
          const metadata = Reflect.getMetadata(processor.metadataKey, prototype, methodName)

          if (metadata) {
            processor.process(instance, methodName, metadata)
          }
        }
      }
    }

    loggers.scanner.debug(`Metadata scan complete`)
  }
}
