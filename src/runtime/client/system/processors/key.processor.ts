import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { METADATA_KEYS } from '../metadata-client.keys'

@injectable()
export class KeyMappingProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.KEY

  process(target: any, methodName: string, metadata: { key: string; description: string }) {
    const handler = target[methodName].bind(target)
    const commandName = `+${methodName}`

    RegisterCommand(commandName, handler, false)
    RegisterKeyMapping(commandName, metadata.description, 'keyboard', metadata.key)

    RegisterCommand(`-${methodName}`, () => {}, false)
  }
}
