import { inject, injectable } from 'tsyringe'
import { VehicleService } from './vehicle.service'
import type { VehicleModificationOptions, VehicleMods } from '../types/vehicle.types'
import { coreLogger } from '../../../kernel/shared/logger'

/**
 * Service for handling vehicle modifications with validation.
 *
 * This service is separated from VehicleService to maintain single responsibility.
 * All modifications are validated server-side before being applied.
 *
 * Security features:
 * - Ownership validation
 * - Proximity checks
 * - Modification limits
 * - Audit logging
 */
@injectable()
export class VehicleModificationService {
  constructor(@inject(VehicleService) private readonly vehicleService: VehicleService) {}

  /**
   * Applies modifications to a vehicle with validation.
   *
   * @param options - Modification options
   * @returns Success status
   */
  applyModifications(options: VehicleModificationOptions): boolean {
    const { networkId, mods, requestedBy } = options

    const vehicle = this.vehicleService.getByNetworkId(networkId)
    if (!vehicle) {
      coreLogger.warn('Vehicle not found for modification', { networkId })
      return false
    }

    if (!vehicle.exists) {
      coreLogger.warn('Vehicle no longer exists', { networkId })
      return false
    }

    if (requestedBy !== undefined) {
      if (!this.vehicleService.validateOwnership(networkId, requestedBy)) {
        coreLogger.warn('Unauthorized modification attempt', {
          networkId,
          requestedBy,
          owner: vehicle.ownership.clientID,
        })
        return false
      }

      if (!this.vehicleService.validateProximity(networkId, requestedBy, 15.0)) {
        coreLogger.warn('Player too far from vehicle for modification', {
          networkId,
          requestedBy,
        })
        return false
      }
    }

    const validatedMods = this.validateMods(mods)

    coreLogger.debug('Vehicle modifications applied', {
      networkId,
      requestedBy,
      mods: Object.keys(validatedMods),
    })

    emitNet('opencore:vehicle:modified', -1, {
      networkId,
      mods: validatedMods,
    })

    return true
  }

  /**
   * Sets vehicle colors with validation.
   *
   * @param networkId - Network ID of the vehicle
   * @param primaryColor - Primary color ID
   * @param secondaryColor - Secondary color ID
   * @param requestedBy - Client ID requesting the change
   * @returns Success status
   */
  setColors(
    networkId: number,
    primaryColor: number,
    secondaryColor: number,
    requestedBy?: number,
  ): boolean {
    return this.applyModifications({
      networkId,
      mods: { primaryColor, secondaryColor },
      requestedBy,
    })
  }

  /**
   * Sets vehicle livery with validation.
   *
   * @param networkId - Network ID of the vehicle
   * @param livery - Livery index
   * @param requestedBy - Client ID requesting the change
   * @returns Success status
   */
  setLivery(networkId: number, livery: number, requestedBy?: number): boolean {
    return this.applyModifications({
      networkId,
      mods: { livery },
      requestedBy,
    })
  }

  /**
   * Toggles vehicle turbo with validation.
   *
   * @param networkId - Network ID of the vehicle
   * @param enabled - Whether turbo should be enabled
   * @param requestedBy - Client ID requesting the change
   * @returns Success status
   */
  setTurbo(networkId: number, enabled: boolean, requestedBy?: number): boolean {
    return this.applyModifications({
      networkId,
      mods: { turbo: enabled },
      requestedBy,
    })
  }

  /**
   * Sets vehicle window tint with validation.
   *
   * @param networkId - Network ID of the vehicle
   * @param tint - Tint level (0-6)
   * @param requestedBy - Client ID requesting the change
   * @returns Success status
   */
  setWindowTint(networkId: number, tint: number, requestedBy?: number): boolean {
    const validTint = Math.max(0, Math.min(6, tint))
    return this.applyModifications({
      networkId,
      mods: { windowTint: validTint },
      requestedBy,
    })
  }

  /**
   * Sets vehicle neon lights with validation.
   *
   * @param networkId - Network ID of the vehicle
   * @param enabled - Array of [left, right, front, back] enabled states
   * @param color - RGB color array
   * @param requestedBy - Client ID requesting the change
   * @returns Success status
   */
  setNeon(
    networkId: number,
    enabled: [boolean, boolean, boolean, boolean],
    color?: [number, number, number],
    requestedBy?: number,
  ): boolean {
    const mods: Partial<VehicleMods> = { neonEnabled: enabled }
    if (color) {
      mods.neonColor = color
    }
    return this.applyModifications({
      networkId,
      mods,
      requestedBy,
    })
  }

  /**
   * Resets all modifications on a vehicle.
   *
   * @param networkId - Network ID of the vehicle
   * @param requestedBy - Client ID requesting the reset
   * @returns Success status
   */
  resetModifications(networkId: number, requestedBy?: number): boolean {
    const vehicle = this.vehicleService.getByNetworkId(networkId)
    if (!vehicle) return false

    if (requestedBy !== undefined) {
      if (!this.vehicleService.validateOwnership(networkId, requestedBy)) {
        return false
      }
    }

    const defaultMods: Partial<VehicleMods> = {
      spoiler: -1,
      frontBumper: -1,
      rearBumper: -1,
      sideSkirt: -1,
      exhaust: -1,
      frame: -1,
      grille: -1,
      hood: -1,
      fender: -1,
      rightFender: -1,
      roof: -1,
      engine: -1,
      brakes: -1,
      transmission: -1,
      horns: -1,
      suspension: -1,
      armor: -1,
      turbo: false,
      xenon: false,
      windowTint: 0,
    }

    coreLogger.info('Vehicle modifications reset', { networkId, requestedBy })

    emitNet('opencore:vehicle:modified', -1, {
      networkId,
      mods: defaultMods,
    })

    return true
  }

  /**
   * Gets the current modifications of a vehicle.
   *
   * @param networkId - Network ID of the vehicle
   * @returns Vehicle mods or undefined
   */
  getModifications(networkId: number): VehicleMods | undefined {
    const vehicle = this.vehicleService.getByNetworkId(networkId)
    return vehicle?.mods
  }

  /**
   * Validates modification values to prevent exploits.
   *
   * @param mods - Modifications to validate
   * @returns Validated modifications
   */
  private validateMods(mods: Partial<VehicleMods>): Partial<VehicleMods> {
    const validated: Partial<VehicleMods> = {}

    const modSlots = [
      'spoiler',
      'frontBumper',
      'rearBumper',
      'sideSkirt',
      'exhaust',
      'frame',
      'grille',
      'hood',
      'fender',
      'rightFender',
      'roof',
      'engine',
      'brakes',
      'transmission',
      'horns',
      'suspension',
      'armor',
      'wheels',
    ] as const

    for (const slot of modSlots) {
      if (mods[slot] !== undefined) {
        const value = mods[slot] as number
        validated[slot] = Math.max(-1, Math.min(50, value))
      }
    }

    if (mods.turbo !== undefined) validated.turbo = Boolean(mods.turbo)
    if (mods.xenon !== undefined) validated.xenon = Boolean(mods.xenon)

    if (mods.wheelType !== undefined) {
      validated.wheelType = Math.max(0, Math.min(12, mods.wheelType))
    }

    if (mods.windowTint !== undefined) {
      validated.windowTint = Math.max(0, Math.min(6, mods.windowTint))
    }

    if (mods.livery !== undefined) {
      validated.livery = Math.max(-1, Math.min(50, mods.livery))
    }

    if (mods.plateStyle !== undefined) {
      validated.plateStyle = Math.max(0, Math.min(5, mods.plateStyle))
    }

    if (mods.primaryColor !== undefined) {
      validated.primaryColor = Math.max(0, Math.min(160, mods.primaryColor))
    }

    if (mods.secondaryColor !== undefined) {
      validated.secondaryColor = Math.max(0, Math.min(160, mods.secondaryColor))
    }

    if (mods.pearlescentColor !== undefined) {
      validated.pearlescentColor = Math.max(0, Math.min(160, mods.pearlescentColor))
    }

    if (mods.wheelColor !== undefined) {
      validated.wheelColor = Math.max(0, Math.min(160, mods.wheelColor))
    }

    if (mods.xenonColor !== undefined) {
      validated.xenonColor = Math.max(0, Math.min(12, mods.xenonColor))
    }

    if (mods.neonEnabled !== undefined) {
      validated.neonEnabled = mods.neonEnabled
    }

    if (mods.neonColor !== undefined) {
      validated.neonColor = [
        Math.max(0, Math.min(255, mods.neonColor[0])),
        Math.max(0, Math.min(255, mods.neonColor[1])),
        Math.max(0, Math.min(255, mods.neonColor[2])),
      ]
    }

    if (mods.extras !== undefined) {
      validated.extras = {}
      for (const [key, value] of Object.entries(mods.extras)) {
        const extraId = Number(key)
        if (extraId >= 0 && extraId <= 20) {
          validated.extras[extraId] = Boolean(value)
        }
      }
    }

    return validated
  }
}
