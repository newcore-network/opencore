import { inject, injectable } from 'tsyringe'
import {
  IClientMarkerBridge,
  type ClientMarkerOptions,
} from '../../../adapters/contracts/client/ui/IClientMarkerBridge'
import { IClientPlatformBridge } from './platform-bridge'

@injectable()
export class PlatformMarkerBridge extends IClientMarkerBridge {
  constructor(
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
  ) {
    super()
  }

  draw(options: ClientMarkerOptions): void {
    this.platform.drawMarker(options)
  }
}
