import { injectable } from 'tsyringe'

/**
 * Runtime Context
 */
@injectable()
export class IRuntimeInfo {
  private _runtime: string

  constructor(runtime: string) {
    this._runtime = runtime
  }

  /**  */
  set(runtime: string): void {
    this._runtime = runtime
  }

  /**  */
  get(): string {
    return this._runtime
  }
}
