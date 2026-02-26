import { RuntimeContext } from './context'
import { EventsAPI } from './events.api'
import { RpcAPI } from './rpc.api'

export abstract class MessagingTransport {
  abstract readonly context: RuntimeContext
  abstract readonly events: EventsAPI<RuntimeContext>
  abstract readonly rpc: RpcAPI<RuntimeContext>
}
