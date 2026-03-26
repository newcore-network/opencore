import { injectable } from 'tsyringe'
import {
  type ClientProgressOptions,
  type ClientProgressState,
  IClientProgressPort,
} from '../../../adapters/contracts/client/progress/IClientProgressPort'

@injectable()
export class NodeClientProgressPort extends IClientProgressPort {
  start(_options: ClientProgressOptions): Promise<boolean> {
    return Promise.resolve(true)
  }

  cancel(): void {}

  isActive(): boolean {
    return false
  }

  getProgress(): number {
    return 0
  }

  getState(): ClientProgressState | null {
    return null
  }
}
