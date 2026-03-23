import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'
import type { EntityStateBag, IEntityServer } from '../../../../src/adapters/contracts/server/IEntityServer'
import type { IVehicleServer } from '../../../../src/adapters/contracts/server/IVehicleServer'
import { Vehicle } from '../../../../src/runtime/server/entities/vehicle'

describe('Vehicle state bag synchronization', () => {
  function createVehicle() {
    const state = new Map<string, unknown>()
    const stateBag: EntityStateBag = {
      set: vi.fn((key: string, value: unknown) => state.set(key, value)),
      get: vi.fn((key: string) => state.get(key)),
    }

    const entityServer: IEntityServer = {
      doesExist: vi.fn(() => true),
      getCoords: vi.fn(() => ({ x: 1, y: 2, z: 3 })),
      setPosition: vi.fn(),
      setCoords: vi.fn(),
      getHeading: vi.fn(() => 90),
      setHeading: vi.fn(),
      getModel: vi.fn(() => 123),
      delete: vi.fn(),
      setOrphanMode: vi.fn(),
      setDimension: vi.fn(),
      getDimension: vi.fn(() => 0),
      getStateBag: vi.fn(() => stateBag),
      getHealth: vi.fn(() => 1000),
      setHealth: vi.fn(),
      getArmor: vi.fn(() => 50),
      setArmor: vi.fn(),
    }

    const vehicleServer: IVehicleServer = {
      getNumberPlateText: vi.fn(() => 'TEST'),
      setNumberPlateText: vi.fn(),
      getColours: vi.fn(() => [0, 0]),
      setColours: vi.fn(),
      setDoorsLocked: vi.fn(),
      getNetworkIdFromEntity: vi.fn(() => 55),
    } as any

    return {
      state,
      stateBag,
      entityServer,
      vehicleServer,
      vehicle: new Vehicle(
        99,
        55,
        { clientID: 1, accountID: 'acc-1', type: 'player' },
        { entityServer, vehicleServer },
        false,
        0,
        'adder',
        123,
      ),
    }
  }

  it('syncs ownership, metadata, mods and flags into the state bag', () => {
    const { state, stateBag, vehicle, vehicleServer } = createVehicle()

    vehicle.setOwnership({ accountID: 'acc-2' })
    vehicle.setMods({ turbo: true, spoiler: 2 })
    vehicle.setMetadata('garage', 'city')
    vehicle.setFuel(135)
    vehicle.setDoorsLocked(true)

    expect(stateBag.set).toHaveBeenCalled()
    expect(state.get('ownership')).toEqual({ clientID: 1, accountID: 'acc-2', type: 'player' })
    expect(state.get('mods')).toEqual({ turbo: true, spoiler: 2 })
    expect(state.get('meta_garage')).toBe('city')
    expect(state.get('fuel')).toBe(100)
    expect(state.get('locked')).toBe(true)
    expect(vehicle.getMetadata('garage')).toBe('city')
    expect(vehicle.getFuel()).toBe(100)
    expect(vehicleServer.setDoorsLocked).toHaveBeenCalledWith(99, 2)
  })
})
