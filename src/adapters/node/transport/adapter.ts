import { MessagingTransport } from '../../contracts/transport/messaging.transport'
import type { RuntimeContext } from '../../contracts/transport/context'
import { NodeEvents } from './node.events'
import { NodeRpc } from './node.rpc'

export class NodeMessagingTransport extends MessagingTransport {
  readonly context: RuntimeContext

  readonly events: NodeEvents
  readonly rpc: NodeRpc

  constructor(context: RuntimeContext = 'server') {
    super()
    this.context = context

    this.events = new NodeEvents()

    this.rpc = new NodeRpc(this.context)
  }
}
