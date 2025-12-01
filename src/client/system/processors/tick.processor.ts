import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-client.keys'

@injectable()
export class TickProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.TICK

  process(target: any, methodName: string) {
    const handler = target[methodName].bind(target)

    setTick(async () => {
      try {
        await handler()
      } catch (error) {
        console.error(`[Client] Error in Tick ${target.constructor.name}.${methodName}:`, error)
      }
    })

    console.log(`[Client] Tick registered: ${target.constructor.name}.${methodName}`)
  }
}
