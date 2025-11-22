
/**
 * Generic permission key used across the framework.
 * Modules are free to define their own namespaces, e.g.:
 * - "bank:withdraw"
 * - "admin:kick"
 * - "inventory:give"
 */
export type PermissionKey = string;

/**
 * Minimal role representation used by the security layer.
 * Specific modules can extend this with more fields if needed.
 */
export interface RoleLike {
  id: string;
  name: string;
  /** Optional numeric weight for hierarchy comparisons (higher = more power). */
  weight?: number;
  permissions: PermissionKey[];
}