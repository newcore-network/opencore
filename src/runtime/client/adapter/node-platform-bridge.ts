import { injectable } from 'tsyringe'
import { IClientPlatformBridge } from './platform-bridge'

@injectable()
export class NodeClientPlatformBridge extends IClientPlatformBridge {}
