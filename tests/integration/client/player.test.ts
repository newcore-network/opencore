// import { describe, it, expect, beforeEach, vi } from 'vitest'
// import {
//   GetEntityCoords,
//   GetEntityHealth,
//   GetEntityMaxHealth,
//   SetEntityHealth,
//   GetPedArmour,
//   SetPedArmour,
//   IsEntityDead,
//   IsPedInAnyVehicle,
//   GetVehiclePedIsIn,
//   SetEntityCoordsNoOffset,
//   SetEntityHeading,
//   FreezeEntityPosition,
//   SetEntityInvincible,
//   SetEntityVisible,
//   GetHashKey,
//   GiveWeaponToPed,
//   RemoveWeaponFromPed,
//   RemoveAllPedWeapons,
//   HasPedGotWeapon,
//   NetworkResurrectLocalPlayer,
// } from '../../mocks/citizenfx'

// // Import after mocks are set up
// import { ClientPlayer } from '../../../src/runtime/client/player/player'

// describe('ClientPlayer', () => {
//   beforeEach(() => {
//     vi.clearAllMocks()
//     ClientPlayer.clearMeta()
//   })

//   describe('Meta Storage System', () => {
//     it('should set and get meta values', () => {
//       ClientPlayer.setMeta('testKey', 'testValue')

//       expect(ClientPlayer.getMeta('testKey')).toBe('testValue')
//     })

//     it('should return undefined for non-existent keys', () => {
//       expect(ClientPlayer.getMeta('nonExistent')).toBeUndefined()
//     })

//     it('should handle different value types', () => {
//       ClientPlayer.setMeta('string', 'hello')
//       ClientPlayer.setMeta('number', 42)
//       ClientPlayer.setMeta('boolean', true)
//       ClientPlayer.setMeta('object', { nested: 'value' })
//       ClientPlayer.setMeta('array', [1, 2, 3])

//       expect(ClientPlayer.getMeta('string')).toBe('hello')
//       expect(ClientPlayer.getMeta('number')).toBe(42)
//       expect(ClientPlayer.getMeta('boolean')).toBe(true)
//       expect(ClientPlayer.getMeta('object')).toEqual({ nested: 'value' })
//       expect(ClientPlayer.getMeta('array')).toEqual([1, 2, 3])
//     })

//     it('should overwrite existing meta values', () => {
//       ClientPlayer.setMeta('key', 'original')
//       ClientPlayer.setMeta('key', 'updated')

//       expect(ClientPlayer.getMeta('key')).toBe('updated')
//     })

//     it('should delete meta values', () => {
//       ClientPlayer.setMeta('toDelete', 'value')
//       ClientPlayer.deleteMeta('toDelete')

//       expect(ClientPlayer.getMeta('toDelete')).toBeUndefined()
//     })

//     it('should get all meta as a copy', () => {
//       ClientPlayer.setMeta('key1', 'value1')
//       ClientPlayer.setMeta('key2', 'value2')

//       const allMeta = ClientPlayer.getAllMeta()

//       expect(allMeta).toEqual({ key1: 'value1', key2: 'value2' })

//       // Should be a copy, not the original
//       allMeta.key1 = 'modified'
//       expect(ClientPlayer.getMeta('key1')).toBe('value1')
//     })

//     it('should clear all meta', () => {
//       ClientPlayer.setMeta('key1', 'value1')
//       ClientPlayer.setMeta('key2', 'value2')

//       ClientPlayer.clearMeta()

//       expect(ClientPlayer.getAllMeta()).toEqual({})
//     })

//     it('should support typed getMeta', () => {
//       interface PlayerData {
//         level: number
//         name: string
//       }

//       const data: PlayerData = { level: 10, name: 'TestPlayer' }
//       ClientPlayer.setMeta('playerData', data)

//       const retrieved = ClientPlayer.getMeta<PlayerData>('playerData')

//       expect(retrieved?.level).toBe(10)
//       expect(retrieved?.name).toBe('TestPlayer')
//     })
//   })

//   describe('Position & Distance Utilities', () => {
//     it('should calculate distance to a position', () => {
//       // Mock player at origin
//       GetEntityCoords.mockReturnValue([0, 0, 0])

//       const distance = ClientPlayer.distanceTo({ x: 3, y: 4, z: 0 })

//       expect(distance).toBe(5) // 3-4-5 triangle
//     })

//     it('should check if near a position', () => {
//       GetEntityCoords.mockReturnValue([0, 0, 0])

//       expect(ClientPlayer.isNearPosition({ x: 1, y: 1, z: 1 }, 5)).toBe(true)
//       expect(ClientPlayer.isNearPosition({ x: 100, y: 100, z: 100 }, 5)).toBe(false)
//     })

//     it('should return player coordinates as Vector3', () => {
//       GetEntityCoords.mockReturnValue([10.5, 20.5, 30.5])

//       const coords = ClientPlayer.coords

//       expect(coords).toEqual({ x: 10.5, y: 20.5, z: 30.5 })
//     })
//   })

//   describe('Health & Status', () => {
//     it('should get current health', () => {
//       GetEntityHealth.mockReturnValue(150)

//       expect(ClientPlayer.health).toBe(150)
//     })

//     it('should get max health', () => {
//       GetEntityMaxHealth.mockReturnValue(200)

//       expect(ClientPlayer.maxHealth).toBe(200)
//     })

//     it('should set health', () => {
//       ClientPlayer.setHealth(175)

//       expect(SetEntityHealth).toHaveBeenCalledWith(1, 175)
//     })

//     it('should get armor', () => {
//       GetPedArmour.mockReturnValue(50)

//       expect(ClientPlayer.armor).toBe(50)
//     })

//     it('should set armor clamped to 0-100', () => {
//       ClientPlayer.setArmor(150)
//       expect(SetPedArmour).toHaveBeenCalledWith(1, 100)

//       ClientPlayer.setArmor(-50)
//       expect(SetPedArmour).toHaveBeenCalledWith(1, 0)

//       ClientPlayer.setArmor(75)
//       expect(SetPedArmour).toHaveBeenCalledWith(1, 75)
//     })

//     it('should check if dead', () => {
//       IsEntityDead.mockReturnValue(true)
//       expect(ClientPlayer.isDead).toBe(true)

//       IsEntityDead.mockReturnValue(false)
//       expect(ClientPlayer.isDead).toBe(false)
//     })

//     it('should heal to full health and armor', () => {
//       GetEntityMaxHealth.mockReturnValue(200)

//       ClientPlayer.heal()

//       expect(SetEntityHealth).toHaveBeenCalledWith(1, 200)
//       expect(SetPedArmour).toHaveBeenCalledWith(1, 100)
//     })

//     it('should revive the player', () => {
//       GetEntityCoords.mockReturnValue([100, 200, 300])
//       GetEntityMaxHealth.mockReturnValue(200)

//       ClientPlayer.revive()

//       expect(NetworkResurrectLocalPlayer).toHaveBeenCalled()
//       expect(SetEntityHealth).toHaveBeenCalled()
//     })
//   })

//   describe('Vehicle State', () => {
//     it('should check if in vehicle', () => {
//       IsPedInAnyVehicle.mockReturnValue(true)
//       expect(ClientPlayer.isInVehicle).toBe(true)

//       IsPedInAnyVehicle.mockReturnValue(false)
//       expect(ClientPlayer.isInVehicle).toBe(false)
//     })

//     it('should return null for currentVehicle when not in vehicle', () => {
//       IsPedInAnyVehicle.mockReturnValue(false)

//       expect(ClientPlayer.currentVehicle).toBeNull()
//     })

//     it('should return vehicle handle when in vehicle', () => {
//       IsPedInAnyVehicle.mockReturnValue(true)
//       GetVehiclePedIsIn.mockReturnValue(12345)

//       expect(ClientPlayer.currentVehicle).toBe(12345)
//     })
//   })

//   describe('Position & Movement', () => {
//     it('should set coordinates', () => {
//       ClientPlayer.setCoords({ x: 100, y: 200, z: 300 })

//       expect(SetEntityCoordsNoOffset).toHaveBeenCalledWith(1, 100, 200, 300, false, false, false)
//     })

//     it('should set coordinates with heading', () => {
//       ClientPlayer.setCoords({ x: 100, y: 200, z: 300 }, 90)

//       expect(SetEntityCoordsNoOffset).toHaveBeenCalled()
//       expect(SetEntityHeading).toHaveBeenCalledWith(1, 90)
//     })

//     it('should freeze position', () => {
//       ClientPlayer.freeze(true)
//       expect(FreezeEntityPosition).toHaveBeenCalledWith(1, true)

//       ClientPlayer.freeze(false)
//       expect(FreezeEntityPosition).toHaveBeenCalledWith(1, false)
//     })

//     it('should set invincibility', () => {
//       ClientPlayer.setInvincible(true)
//       expect(SetEntityInvincible).toHaveBeenCalledWith(1, true)
//     })

//     it('should set visibility', () => {
//       ClientPlayer.setVisible(false)
//       expect(SetEntityVisible).toHaveBeenCalledWith(1, false, false)
//     })
//   })

//   describe('Weapons', () => {
//     it('should give weapon to player', () => {
//       ClientPlayer.giveWeapon('WEAPON_PISTOL', 50, true)

//       expect(GetHashKey).toHaveBeenCalledWith('WEAPON_PISTOL')
//       expect(GiveWeaponToPed).toHaveBeenCalled()
//     })

//     it('should remove weapon from player', () => {
//       ClientPlayer.removeWeapon('WEAPON_PISTOL')

//       expect(GetHashKey).toHaveBeenCalledWith('WEAPON_PISTOL')
//       expect(RemoveWeaponFromPed).toHaveBeenCalled()
//     })

//     it('should remove all weapons', () => {
//       ClientPlayer.removeAllWeapons()

//       expect(RemoveAllPedWeapons).toHaveBeenCalledWith(1, true)
//     })

//     it('should check if player has weapon', () => {
//       HasPedGotWeapon.mockReturnValue(true)

//       expect(ClientPlayer.hasWeapon('WEAPON_PISTOL')).toBe(true)
//       expect(GetHashKey).toHaveBeenCalledWith('WEAPON_PISTOL')
//     })
//   })
// })
