import { IResourceInfo } from '../IResourceInfo'

export class FiveMResourceInfo extends IResourceInfo {
  getCurrentResourceName(): string {
    const fn = GetCurrentResourceName
    if (typeof fn === 'function') {
      const name = fn()
      if (typeof name === 'string' && name.trim()) return name
    }
    return 'default'
  }
}
