/**
 * Type representing a linked account identifier. This come from your persistence layer
 * and is used to associate a Player session with their stored data.
 */
export type LinkedID = string | UUIDTypes | number
