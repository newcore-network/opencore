import { injectable, injectAll, container } from 'tsyringe'
import { DecoratorProcessor } from './decorator-processor'
import { ClassConstructor } from './class-constructor'
// Asegúrate de importar esto desde tus tipos compartidos

@injectable()
export class MetadataScanner {
  constructor(@injectAll('DecoratorProcessor') private processors: DecoratorProcessor[]) {}

  public scan(registry: ClassConstructor[]) {
    console.log(
      `[Core] Scannig metadata in ${registry.length} controllers from ${this.processors.length} processors...`,
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
  }
}
