import { vi } from 'vitest'

// Storage for registered handlers
export const registeredNetEvents = new Map<string, (...args: any[]) => void>()
export const registeredCommands = new Map<string, (...args: any[]) => void>()
export const registeredKeyMappings = new Map<string, { description: string; key: string }>()
export const emittedNetEvents: Array<{ eventName: string; target: number | string; args: any[] }> =
  []

// Reset all mocks state
export function resetCitizenFxMocks() {
  registeredNetEvents.clear()
  registeredCommands.clear()
  registeredKeyMappings.clear()
  emittedNetEvents.length = 0
  ;(global as any).source = 0
}

// Server-side mocks
export const onNet = vi.fn((eventName: string, handler: (...args: any[]) => void) => {
  registeredNetEvents.set(eventName, handler)
})

export const emitNet = vi.fn((eventName: string, target: number | string, ...args: any[]) => {
  emittedNetEvents.push({ eventName, target, args })
})

export const RegisterCommand = vi.fn(
  (commandName: string, handler: (...args: any[]) => void, _restricted: boolean) => {
    registeredCommands.set(commandName, handler)
  },
)

export const RegisterKeyMapping = vi.fn(
  (commandName: string, description: string, _inputMapper: string, key: string) => {
    registeredKeyMappings.set(commandName, { description, key })
  },
)

export const GetCurrentResourceName = vi.fn(() => 'opencore-test')

export const GetPlayerIdentifiers = vi.fn((playerId: number) => [
  `license:test-license-${playerId}`,
  `discord:123456789`,
  `steam:test-steam-${playerId}`,
])

export const GetPlayerName = vi.fn((playerId: number) => `TestPlayer${playerId}`)

export const GetNumPlayerIdentifiers = vi.fn((_playerId: number) => 3)

export const GetPlayerIdentifier = vi.fn((playerId: number, index: number) => {
  const identifiers = [`license:test-license-${playerId}`, `discord:123456789`, `steam:test-steam`]
  return identifiers[index] || null
})

// Returns array of connected player sources as strings
export const getPlayers = vi.fn(() => [] as string[])

// Client-side mocks
export const TriggerServerEvent = vi.fn((eventName: string, ...args: any[]) => {
  emittedNetEvents.push({ eventName, target: 'server', args })
})

export const TriggerEvent = vi.fn((eventName: string, ...args: any[]) => {
  const handler = registeredNetEvents.get(eventName)
  if (handler) {
    handler(...args)
  }
})

export const AddEventHandler = vi.fn((eventName: string, handler: (...args: any[]) => void) => {
  registeredNetEvents.set(eventName, handler)
})

// Generic event handler
export const on = vi.fn((eventName: string, handler: (...args: any[]) => void) => {
  registeredNetEvents.set(eventName, handler)
})

// Player data mocks (client)
export const PlayerPedId = vi.fn(() => 1)
export const PlayerId = vi.fn(() => 1)
export const GetPlayerServerId = vi.fn((_playerId: number) => 1)
export const GetEntityCoords = vi.fn((_entity: number, _alive?: boolean) => [0.0, 0.0, 0.0])
export const GetEntityHeading = vi.fn((_entity: number) => 0.0)
export const SetEntityCoords = vi.fn(
  (
    _entity: number,
    _x: number,
    _y: number,
    _z: number,
    _xAxis: boolean,
    _yAxis: boolean,
    _zAxis: boolean,
    _clearArea: boolean,
  ) => {},
)
export const SetEntityCoordsNoOffset = vi.fn(
  (_entity: number, _x: number, _y: number, _z: number, ..._args: any[]) => {},
)
export const SetEntityHeading = vi.fn((_entity: number, _heading: number) => {})

// Entity health/status
export const GetEntityHealth = vi.fn((_entity: number) => 200)
export const GetEntityMaxHealth = vi.fn((_entity: number) => 200)
export const SetEntityHealth = vi.fn((_entity: number, _health: number) => {})
export const GetPedArmour = vi.fn((_ped: number) => 0)
export const SetPedArmour = vi.fn((_ped: number, _armor: number) => {})
export const IsEntityDead = vi.fn((_entity: number) => false)
export const IsEntityInWater = vi.fn((_entity: number) => false)

// Ped state
export const IsPedSwimming = vi.fn((_ped: number) => false)
export const IsPedFalling = vi.fn((_ped: number) => false)
export const IsPedClimbing = vi.fn((_ped: number) => false)
export const IsPedRagdoll = vi.fn((_ped: number) => false)
export const IsPedInParachuteFreeFall = vi.fn((_ped: number) => false)
export const IsPedWalking = vi.fn((_ped: number) => false)
export const IsPedRunning = vi.fn((_ped: number) => false)
export const IsPedSprinting = vi.fn((_ped: number) => false)
export const IsPedOnFoot = vi.fn((_ped: number) => true)
export const IsPedStill = vi.fn((_ped: number) => true)
export const GetEntitySpeed = vi.fn((_entity: number) => 0)

// Vehicle
export const IsPedInAnyVehicle = vi.fn((_ped: number, _atGetIn: boolean) => false)
export const GetVehiclePedIsIn = vi.fn((_ped: number, _lastVehicle: boolean) => 0)
export const GetPedInVehicleSeat = vi.fn((_vehicle: number, _seat: number) => 0)
export const GetVehicleMaxNumberOfPassengers = vi.fn((_vehicle: number) => 4)
export const TaskWarpPedIntoVehicle = vi.fn((_ped: number, _vehicle: number, _seat: number) => {})
export const TaskLeaveVehicle = vi.fn((_ped: number, _vehicle: number, _flags: number) => {})

// Combat
export const IsPedShooting = vi.fn((_ped: number) => false)
export const IsPlayerFreeAiming = vi.fn((_playerId: number) => false)
export const IsPedReloading = vi.fn((_ped: number) => false)
export const IsPedInCover = vi.fn((_ped: number, _arg: boolean) => false)
export const IsPedInMeleeCombat = vi.fn((_ped: number) => false)
export const GetCurrentPedWeapon = vi.fn((_ped: number, _arg: boolean) => [true, 0])
export const GetAmmoInPedWeapon = vi.fn((_ped: number, _weaponHash: number) => 0)

// Weapons
export const GetHashKey = vi.fn((str: string) => str.length * 1000)
export const GiveWeaponToPed = vi.fn(
  (_ped: number, _hash: number, _ammo: number, _arg1: boolean, _arg2: boolean) => {},
)
export const RemoveWeaponFromPed = vi.fn((_ped: number, _hash: number) => {})
export const RemoveAllPedWeapons = vi.fn((_ped: number, _arg: boolean) => {})
export const SetPedAmmo = vi.fn((_ped: number, _hash: number, _ammo: number) => {})
export const HasPedGotWeapon = vi.fn((_ped: number, _hash: number, _arg: boolean) => false)

// Entity control
export const FreezeEntityPosition = vi.fn((_entity: number, _freeze: boolean) => {})
export const SetEntityInvincible = vi.fn((_entity: number, _invincible: boolean) => {})
export const SetEntityVisible = vi.fn((_entity: number, _visible: boolean, _arg: boolean) => {})
export const SetEntityAlpha = vi.fn((_entity: number, _alpha: number, _arg: boolean) => {})
export const SetPedCanRagdoll = vi.fn((_ped: number, _canRagdoll: boolean) => {})
export const SetPedConfigFlag = vi.fn((_ped: number, _flag: number, _value: boolean) => {})
export const GetPedConfigFlag = vi.fn((_ped: number, _flag: number, _arg: boolean) => false)

// Animations
export const RequestAnimDict = vi.fn((_dict: string) => {})
export const HasAnimDictLoaded = vi.fn((_dict: string) => true)
export const TaskPlayAnim = vi.fn((..._args: any[]) => {})
export const ClearPedTasks = vi.fn((_ped: number) => {})
export const ClearPedTasksImmediately = vi.fn((_ped: number) => {})
export const IsEntityPlayingAnim = vi.fn(
  (_entity: number, _dict: string, _name: string, _flag: number) => false,
)

// Respawn
export const NetworkResurrectLocalPlayer = vi.fn((..._args: any[]) => {})

// Controls
export const DisableControlAction = vi.fn(
  (_padIndex: number, _control: number, _disable: boolean) => {},
)
export const IsControlPressed = vi.fn((_padIndex: number, _control: number) => false)
export const IsControlJustPressed = vi.fn((_padIndex: number, _control: number) => false)

// Aiming
export const GetEntityPlayerIsFreeAimingAt = vi.fn((_playerId: number) => [false, 0])

// Resource file operations
export const LoadResourceFile = vi.fn((_resourceName: string, _fileName: string) => null)
export const SaveResourceFile = vi.fn(
  (_resourceName: string, _fileName: string, _data: string, _length: number) => true,
)

// Exports mock
export const exportsObj: Record<string, Record<string, (...args: any[]) => any>> = {}
export const exports = new Proxy(exportsObj, {
  get(target, resourceName: string) {
    if (!target[resourceName]) {
      target[resourceName] = {}
    }
    return new Proxy(target[resourceName], {
      get(innerTarget, exportName: string) {
        return innerTarget[exportName] || vi.fn()
      },
      set(innerTarget, exportName: string, value: any) {
        innerTarget[exportName] = value
        return true
      },
    })
  },
})

// Install all mocks to global scope
export function installGlobalMocks() {
  const globalObj = global as any

  // Server natives
  globalObj.onNet = onNet
  globalObj.emitNet = emitNet
  globalObj.RegisterCommand = RegisterCommand
  globalObj.GetCurrentResourceName = GetCurrentResourceName
  globalObj.GetPlayerIdentifiers = GetPlayerIdentifiers
  globalObj.GetPlayerName = GetPlayerName
  globalObj.GetNumPlayerIdentifiers = GetNumPlayerIdentifiers
  globalObj.GetPlayerIdentifier = GetPlayerIdentifier
  globalObj.getPlayers = getPlayers

  // Client natives - core
  globalObj.TriggerServerEvent = TriggerServerEvent
  globalObj.TriggerEvent = TriggerEvent
  globalObj.AddEventHandler = AddEventHandler
  globalObj.RegisterKeyMapping = RegisterKeyMapping
  globalObj.PlayerPedId = PlayerPedId
  globalObj.PlayerId = PlayerId
  globalObj.GetPlayerServerId = GetPlayerServerId
  globalObj.GetEntityCoords = GetEntityCoords
  globalObj.GetEntityHeading = GetEntityHeading
  globalObj.SetEntityCoords = SetEntityCoords
  globalObj.SetEntityCoordsNoOffset = SetEntityCoordsNoOffset
  globalObj.SetEntityHeading = SetEntityHeading

  // Client natives - health/status
  globalObj.GetEntityHealth = GetEntityHealth
  globalObj.GetEntityMaxHealth = GetEntityMaxHealth
  globalObj.SetEntityHealth = SetEntityHealth
  globalObj.GetPedArmour = GetPedArmour
  globalObj.SetPedArmour = SetPedArmour
  globalObj.IsEntityDead = IsEntityDead
  globalObj.IsEntityInWater = IsEntityInWater

  // Client natives - ped state
  globalObj.IsPedSwimming = IsPedSwimming
  globalObj.IsPedFalling = IsPedFalling
  globalObj.IsPedClimbing = IsPedClimbing
  globalObj.IsPedRagdoll = IsPedRagdoll
  globalObj.IsPedInParachuteFreeFall = IsPedInParachuteFreeFall
  globalObj.IsPedWalking = IsPedWalking
  globalObj.IsPedRunning = IsPedRunning
  globalObj.IsPedSprinting = IsPedSprinting
  globalObj.IsPedOnFoot = IsPedOnFoot
  globalObj.IsPedStill = IsPedStill
  globalObj.GetEntitySpeed = GetEntitySpeed

  // Client natives - vehicle
  globalObj.IsPedInAnyVehicle = IsPedInAnyVehicle
  globalObj.GetVehiclePedIsIn = GetVehiclePedIsIn
  globalObj.GetPedInVehicleSeat = GetPedInVehicleSeat
  globalObj.GetVehicleMaxNumberOfPassengers = GetVehicleMaxNumberOfPassengers
  globalObj.TaskWarpPedIntoVehicle = TaskWarpPedIntoVehicle
  globalObj.TaskLeaveVehicle = TaskLeaveVehicle

  // Client natives - combat
  globalObj.IsPedShooting = IsPedShooting
  globalObj.IsPlayerFreeAiming = IsPlayerFreeAiming
  globalObj.IsPedReloading = IsPedReloading
  globalObj.IsPedInCover = IsPedInCover
  globalObj.IsPedInMeleeCombat = IsPedInMeleeCombat
  globalObj.GetCurrentPedWeapon = GetCurrentPedWeapon
  globalObj.GetAmmoInPedWeapon = GetAmmoInPedWeapon

  // Client natives - weapons
  globalObj.GetHashKey = GetHashKey
  globalObj.GiveWeaponToPed = GiveWeaponToPed
  globalObj.RemoveWeaponFromPed = RemoveWeaponFromPed
  globalObj.RemoveAllPedWeapons = RemoveAllPedWeapons
  globalObj.SetPedAmmo = SetPedAmmo
  globalObj.HasPedGotWeapon = HasPedGotWeapon

  // Client natives - entity control
  globalObj.FreezeEntityPosition = FreezeEntityPosition
  globalObj.SetEntityInvincible = SetEntityInvincible
  globalObj.SetEntityVisible = SetEntityVisible
  globalObj.SetEntityAlpha = SetEntityAlpha
  globalObj.SetPedCanRagdoll = SetPedCanRagdoll
  globalObj.SetPedConfigFlag = SetPedConfigFlag
  globalObj.GetPedConfigFlag = GetPedConfigFlag

  // Client natives - animations
  globalObj.RequestAnimDict = RequestAnimDict
  globalObj.HasAnimDictLoaded = HasAnimDictLoaded
  globalObj.TaskPlayAnim = TaskPlayAnim
  globalObj.ClearPedTasks = ClearPedTasks
  globalObj.ClearPedTasksImmediately = ClearPedTasksImmediately
  globalObj.IsEntityPlayingAnim = IsEntityPlayingAnim

  // Client natives - respawn
  globalObj.NetworkResurrectLocalPlayer = NetworkResurrectLocalPlayer

  // Client natives - controls
  globalObj.DisableControlAction = DisableControlAction
  globalObj.IsControlPressed = IsControlPressed
  globalObj.IsControlJustPressed = IsControlJustPressed
  globalObj.GetEntityPlayerIsFreeAimingAt = GetEntityPlayerIsFreeAimingAt

  // Common
  globalObj.on = on
  globalObj.exports = exports
  globalObj.LoadResourceFile = LoadResourceFile
  globalObj.SaveResourceFile = SaveResourceFile

  // Source for server events
  globalObj.source = 0
}
