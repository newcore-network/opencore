import { Controller } from '../decorators/controller'
import { Export } from '../decorators/export'

@Controller()
export class ReadyController {
  private isReady = false

  constructor() {
    // Set ready after a small tick to ensure bootstrap finishes
    setTimeout(() => {
      this.isReady = true
    }, 0)
  }

  @Export()
  isCoreReady(): boolean {
    return this.isReady
  }
}
