import { Controller } from '../decorators/controller'
import { Export } from '../decorators/export'

@Controller()
export class ReadyController {
  private isReady = true

  @Export()
  isCoreReady(): boolean {
    return this.isReady
  }
}
