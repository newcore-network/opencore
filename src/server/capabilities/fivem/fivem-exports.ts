import { IExports } from '../IExports'

export class FiveMExports extends IExports {
  register(exportName: string, handler: (...args: any[]) => any): void {
    exports(exportName, handler)
  }

  getResource<T = any>(resourceName: string): T | undefined {
    return exports?.[resourceName] as T | undefined
  }
}
