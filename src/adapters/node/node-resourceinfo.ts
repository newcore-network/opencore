import { injectable } from 'tsyringe'
import { IResourceInfo } from '../contracts/IResourceInfo'

/**
 * Node.js implementation of IResourceInfo.
 * Suitable for testing and non-FiveM runtime environments.
 *
 * Resource name is determined by:
 * 1. RESOURCE_NAME environment variable
 * 2. Fallback to 'default'
 */
@injectable()
export class NodeResourceInfo implements IResourceInfo {
  getCurrentResourceName(): string {
    return process.env.RESOURCE_NAME || 'default'
  }
}
