import { injectable } from 'tsyringe'
import {
  IClientNotificationBridge,
  type ClientNotificationDefinition,
} from '../../../adapters/contracts/client/ui/IClientNotificationBridge'

@injectable()
export class NodeClientNotificationBridge extends IClientNotificationBridge {
  show(_definition: ClientNotificationDefinition): void {}

  clear(_scope?: 'help' | 'subtitle' | 'all'): void {}
}
