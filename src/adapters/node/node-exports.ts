import { injectable } from 'tsyringe'
import type { IExports } from '../contracts/IExports'

/**
 * Node.js implementation of IExports using in-memory registry.
 * Suitable for testing and non-FiveM runtime environments.
 */
@injectable()
export class NodeExports implements IExports {
  private exports = new Map<string, Function>()

  register(exportName: string, handler: Function): void {
    this.exports.set(exportName, handler)
  }

  getResource(resourceName: string): any {
    // In Node.js environment, cross-resource access is not supported
    // This is a stub that returns an object with the current resource's exports
    if (resourceName === this.getCurrentResourceName()) {
      return this.getExportsObject()
    }

    throw new Error(
      `Cross-resource exports not supported in Node.js runtime. ` +
        `Attempted to access resource: ${resourceName}`,
    )
  }

  /**
   * Get all registered exports as an object
   */
  private getExportsObject(): any {
    const obj: any = {}
    this.exports.forEach((handler, name) => {
      obj[name] = handler
    })
    return obj
  }

  /**
   * Get the current resource name (stub for Node environment)
   */
  private getCurrentResourceName(): string {
    return process.env.RESOURCE_NAME || 'default'
  }

  /**
   * Utility method for testing: get a specific export
   */
  getExport(exportName: string): Function | undefined {
    return this.exports.get(exportName)
  }

  /**
   * Utility method for testing: clear all exports
   */
  clearExports(): void {
    this.exports.clear()
  }
}
