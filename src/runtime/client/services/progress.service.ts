import { inject, injectable } from 'tsyringe'
import {
  type ClientProgressOptions as ProgressOptions,
  type ClientProgressState as ProgressState,
  IClientProgressPort,
} from '../../../adapters/contracts/client/progress/IClientProgressPort'

export type { ProgressOptions, ProgressState }

@injectable()
export class ProgressService {
  constructor(
    @inject(IClientProgressPort as any) private readonly progressPort: IClientProgressPort,
  ) {}

  async start(options: ProgressOptions): Promise<boolean> {
    return this.progressPort.start(options)
  }

  cancel(): void {
    this.progressPort.cancel()
  }

  isActive(): boolean {
    return this.progressPort.isActive()
  }
  getProgress(): number {
    return this.progressPort.getProgress()
  }
  getState(): ProgressState | null {
    return this.progressPort.getState()
  }
}
