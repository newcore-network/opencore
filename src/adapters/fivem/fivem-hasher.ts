import { injectable } from 'tsyringe'
import { IHasher } from '../contracts/IHasher'

/**
 * FiveM implementation of hash utilities.
 */
@injectable()
export class FiveMHasher extends IHasher {
  getHashKey(str: string): number {
    return GetHashKey(str)
  }
}
