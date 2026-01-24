import { IResourceInfo } from '../contracts/IResourceInfo'

export class FiveMResourceInfo extends IResourceInfo {
  getCurrentResourceName(): string {
    const fn = GetCurrentResourceName
    if (typeof fn === 'function') {
      const name = fn()
      if (typeof name === 'string' && name.trim()) return name
    }
    return 'default'
  }

  getCurrentResourcePath(): string {
    const fn = (globalThis as any).GetResourcePath
    if (typeof fn === 'function') {
      const name = this.getCurrentResourceName()
      if (name) {
        const path = fn(name)
        if (typeof path === 'string' && path.trim()) return path
      }
    }
    return process.cwd()
  }
}
