/**
 * Hash utility adapter.
 *
 * @remarks
 * Abstracts hash functions like GetHashKey.
 */
export abstract class IHasher {
  /**
   * Gets the hash key for a string (joaat hash).
   *
   * @param str - String to hash
   * @returns Hash value
   */
  abstract getHashKey(str: string): number
}
