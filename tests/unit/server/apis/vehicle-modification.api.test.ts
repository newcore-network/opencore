import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'
import { SYSTEM_EVENTS } from '../../../../src/runtime/shared/types/system-types'
import { VehicleModification } from '../../../../src/runtime/server/apis/vehicle-modification.api'

describe('VehicleModification', () => {
  function createService(options: { exists?: boolean; owns?: boolean; near?: boolean } = {}) {
    const vehicle = {
      exists: options.exists ?? true,
      ownership: { clientID: 7 },
      mods: {},
    }

    const vehicles = {
      getByNetworkId: vi.fn(() => vehicle),
      validateOwnership: vi.fn(() => options.owns ?? true),
      validateProximity: vi.fn(() => options.near ?? true),
    }

    const events = {
      emit: vi.fn(),
    }

    return {
      service: new VehicleModification(vehicles as any, events as any),
      vehicles,
      events,
    }
  }

  it('applies validated modifications and emits the clamped payload', () => {
    const { service, events } = createService()

    const success = service.applyModifications({
      networkId: 10,
      requestedBy: 7,
      mods: {
        spoiler: 999,
        windowTint: 20,
        primaryColor: 500,
        extras: { 1: true, 21: true },
      },
    })

    expect(success).toBe(true)
    expect(events.emit).toHaveBeenCalledWith(SYSTEM_EVENTS.vehicle.modified, 'all', {
      networkId: 10,
      mods: {
        spoiler: 50,
        windowTint: 6,
        primaryColor: 160,
        extras: { 1: true },
      },
    })
  })

  it('blocks unauthorized modification attempts', () => {
    const { service, events, vehicles } = createService({ owns: false })

    const success = service.setTurbo(10, true, 99)

    expect(success).toBe(false)
    expect(vehicles.validateOwnership).toHaveBeenCalledWith(10, 99)
    expect(events.emit).not.toHaveBeenCalled()
  })

  it('blocks modification attempts when the player is too far away', () => {
    const { service, events, vehicles } = createService({ near: false })

    const success = service.setColors(10, 1, 2, 7)

    expect(success).toBe(false)
    expect(vehicles.validateProximity).toHaveBeenCalledWith(10, 7, 15)
    expect(events.emit).not.toHaveBeenCalled()
  })

  it('resets modifications to framework defaults', () => {
    const { service, events } = createService()

    const success = service.resetModifications(15, 7)

    expect(success).toBe(true)
    expect(events.emit).toHaveBeenCalledWith(
      SYSTEM_EVENTS.vehicle.modified,
      'all',
      expect.objectContaining({
        networkId: 15,
        mods: expect.objectContaining({
          spoiler: -1,
          turbo: false,
          windowTint: 0,
        }),
      }),
    )
  })
})
