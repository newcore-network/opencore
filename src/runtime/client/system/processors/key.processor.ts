import { inject, injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { IClientRuntimeBridge } from '../../adapter/runtime-bridge'
import { METADATA_KEYS } from '../metadata-client.keys'

@injectable()
export class KeyMappingProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.KEY

  constructor(@inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge) {}

  process(target: any, methodName: string, metadata: { key: string; description?: string }) {
    const handler = target[methodName].bind(target)
    const commandName = `+${methodName}`

    this.runtime.registerCommand(commandName, handler, false)
    this.runtime.registerKeyMapping(
      commandName,
      metadata.description ?? 'none',
      'keyboard',
      metadata.key,
    )

    this.runtime.registerCommand(`-${methodName}`, () => {}, false)
  }
}
