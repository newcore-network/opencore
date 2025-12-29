import { injectable } from 'tsyringe'
import { IHasher } from '../contracts/IHasher'

/**
 * Node.js implementation of hash utilities.
 * Implements joaat hash algorithm.
 */
@injectable()
export class NodeHasher extends IHasher {
  /**
   * Gets the hash key for a string using joaat algorithm.
   * This is the same algorithm FiveM uses for GetHashKey.
   */
  getHashKey(str: string): number {
    const key = str.toLowerCase()
    let hash = 0

    for (let i = 0; i < key.length; i++) {
      hash += key.charCodeAt(i)
      hash += hash << 10
      hash ^= hash >>> 6
    }

    hash += hash << 3
    hash ^= hash >>> 11
    hash += hash << 15

    // Convert to unsigned 32-bit integer
    return hash >>> 0
  }
}
