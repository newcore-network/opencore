import { Vector3 } from '../../../'

/**
 * Vehicle ownership information
 */
export interface VehicleOwnership {
  /** Client ID of the owner (if player-owned) */
  clientID?: number
  /** Account ID of the owner (if persistent) */
  accountID?: string
  /** Type of ownership */
  type: 'player' | 'server' | 'temporary' | 'shared'
}

/**
 * Vehicle modification data structure
 */
export interface VehicleMods {
  spoiler?: number
  frontBumper?: number
  rearBumper?: number
  sideSkirt?: number
  exhaust?: number
  frame?: number
  grille?: number
  hood?: number
  fender?: number
  rightFender?: number
  roof?: number
  engine?: number
  brakes?: number
  transmission?: number
  horns?: number
  suspension?: number
  armor?: number
  turbo?: boolean
  xenon?: boolean
  xenonColor?: number
  wheelType?: number
  wheels?: number
  windowTint?: number
  livery?: number
  plateStyle?: number
  primaryColor?: number
  secondaryColor?: number
  pearlescentColor?: number
  wheelColor?: number
  neonEnabled?: [boolean, boolean, boolean, boolean]
  neonColor?: [number, number, number]
  extras?: Record<number, boolean>
}

/**
 * Options for creating a new vehicle
 */
export interface VehicleCreateOptions {
  /** Vehicle model name or hash */
  model: string
  /** Spawn position */
  position: Vector3
  /** Heading/rotation in degrees */
  heading?: number
  /** License plate text */
  plate?: string
  /** Primary color */
  primaryColor?: number
  /** Secondary color */
  secondaryColor?: number
  /** Initial modifications */
  mods?: Partial<VehicleMods>
  /** Whether vehicle should be persistent (survives server restart if saved) */
  persistent?: boolean
  /** Ownership information */
  ownership?: Partial<VehicleOwnership>
  /** Custom metadata */
  metadata?: Record<string, any>
  /** Routing bucket (default: 0) */
  routingBucket?: number
  /** Whether to lock the vehicle */
  locked?: boolean
  /** Fuel level (0.0-1.0) */
  fuel?: number
}

/**
 * Options for modifying an existing vehicle
 */
export interface VehicleModificationOptions {
  /** Network ID of the vehicle to modify */
  networkId: number
  /** Modifications to apply */
  mods: Partial<VehicleMods>
  /** Client ID requesting the modification (for validation) */
  requestedBy?: number
}

/**
 * Vehicle metadata stored in state bags
 */
export interface VehicleMetadata {
  /** Custom key-value pairs */
  [key: string]: any
  /** Fuel level */
  fuel?: number
  /** Engine health */
  engineHealth?: number
  /** Body health */
  bodyHealth?: number
  /** Last driver client ID */
  lastDriver?: number
  /** Creation timestamp */
  createdAt?: number
  /** Last modification timestamp */
  modifiedAt?: number
}

/**
 * Serialized vehicle data for network transfer
 */
export interface SerializedVehicleData {
  /** Network ID */
  networkId: number
  /** Entity handle (server-side) */
  handle: number
  /** Vehicle model hash */
  modelHash: number
  /** Vehicle model */
  model: string
  /** Current position */
  position: Vector3
  /** Current heading */
  heading: number
  /** License plate */
  plate: string
  /** Ownership information */
  ownership: VehicleOwnership
  /** Applied modifications */
  mods: VehicleMods
  /** Custom metadata */
  metadata: VehicleMetadata
  /** Routing bucket */
  routingBucket: number
  /** Whether vehicle is persistent */
  persistent: boolean
}

/**
 * Vehicle spawn result
 */
export interface VehicleSpawnResult {
  /** Network ID of the spawned vehicle */
  networkId: number
  /** Entity handle */
  handle: number
  /** Success status */
  success: boolean
  /** Error message if failed */
  error?: string
}
