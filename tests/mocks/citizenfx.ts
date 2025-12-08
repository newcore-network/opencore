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
  (commandName: string, handler: (...args: any[]) => void, restricted: boolean) => {
    registeredCommands.set(commandName, handler)
  },
)

export const RegisterKeyMapping = vi.fn(
  (commandName: string, description: string, inputMapper: string, key: string) => {
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

export const GetNumPlayerIdentifiers = vi.fn((playerId: number) => 3)

export const GetPlayerIdentifier = vi.fn((playerId: number, index: number) => {
  const identifiers = [`license:test-license-${playerId}`, `discord:123456789`, `steam:test-steam`]
  return identifiers[index] || null
})

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
export const GetPlayerServerId = vi.fn((playerId: number) => 1)
export const GetEntityCoords = vi.fn((entity: number, alive?: boolean) => [0.0, 0.0, 0.0])
export const GetEntityHeading = vi.fn((entity: number) => 0.0)
export const SetEntityCoords = vi.fn(
  (
    entity: number,
    x: number,
    y: number,
    z: number,
    xAxis: boolean,
    yAxis: boolean,
    zAxis: boolean,
    clearArea: boolean,
  ) => {},
)
export const SetEntityCoordsNoOffset = vi.fn(
  (entity: number, x: number, y: number, z: number, ...args: any[]) => {},
)
export const SetEntityHeading = vi.fn((entity: number, heading: number) => {})

// Entity health/status
export const GetEntityHealth = vi.fn((entity: number) => 200)
export const GetEntityMaxHealth = vi.fn((entity: number) => 200)
export const SetEntityHealth = vi.fn((entity: number, health: number) => {})
export const GetPedArmour = vi.fn((ped: number) => 0)
export const SetPedArmour = vi.fn((ped: number, armor: number) => {})
export const IsEntityDead = vi.fn((entity: number) => false)
export const IsEntityInWater = vi.fn((entity: number) => false)

// Ped state
export const IsPedSwimming = vi.fn((ped: number) => false)
export const IsPedFalling = vi.fn((ped: number) => false)
export const IsPedClimbing = vi.fn((ped: number) => false)
export const IsPedRagdoll = vi.fn((ped: number) => false)
export const IsPedInParachuteFreeFall = vi.fn((ped: number) => false)
export const IsPedWalking = vi.fn((ped: number) => false)
export const IsPedRunning = vi.fn((ped: number) => false)
export const IsPedSprinting = vi.fn((ped: number) => false)
export const IsPedOnFoot = vi.fn((ped: number) => true)
export const IsPedStill = vi.fn((ped: number) => true)
export const GetEntitySpeed = vi.fn((entity: number) => 0)

// Vehicle
export const IsPedInAnyVehicle = vi.fn((ped: number, atGetIn: boolean) => false)
export const GetVehiclePedIsIn = vi.fn((ped: number, lastVehicle: boolean) => 0)
export const GetPedInVehicleSeat = vi.fn((vehicle: number, seat: number) => 0)
export const GetVehicleMaxNumberOfPassengers = vi.fn((vehicle: number) => 4)
export const TaskWarpPedIntoVehicle = vi.fn((ped: number, vehicle: number, seat: number) => {})
export const TaskLeaveVehicle = vi.fn((ped: number, vehicle: number, flags: number) => {})

// Combat
export const IsPedShooting = vi.fn((ped: number) => false)
export const IsPlayerFreeAiming = vi.fn((playerId: number) => false)
export const IsPedReloading = vi.fn((ped: number) => false)
export const IsPedInCover = vi.fn((ped: number, arg: boolean) => false)
export const IsPedInMeleeCombat = vi.fn((ped: number) => false)
export const GetCurrentPedWeapon = vi.fn((ped: number, arg: boolean) => [true, 0])
export const GetAmmoInPedWeapon = vi.fn((ped: number, weaponHash: number) => 0)

// Weapons
export const GetHashKey = vi.fn((str: string) => str.length * 1000)
export const GiveWeaponToPed = vi.fn(
  (ped: number, hash: number, ammo: number, arg1: boolean, arg2: boolean) => {},
)
export const RemoveWeaponFromPed = vi.fn((ped: number, hash: number) => {})
export const RemoveAllPedWeapons = vi.fn((ped: number, arg: boolean) => {})
export const SetPedAmmo = vi.fn((ped: number, hash: number, ammo: number) => {})
export const HasPedGotWeapon = vi.fn((ped: number, hash: number, arg: boolean) => false)

// Entity control
export const FreezeEntityPosition = vi.fn((entity: number, freeze: boolean) => {})
export const SetEntityInvincible = vi.fn((entity: number, invincible: boolean) => {})
export const SetEntityVisible = vi.fn((entity: number, visible: boolean, arg: boolean) => {})
export const SetEntityAlpha = vi.fn((entity: number, alpha: number, arg: boolean) => {})
export const SetPedCanRagdoll = vi.fn((ped: number, canRagdoll: boolean) => {})
export const SetPedConfigFlag = vi.fn((ped: number, flag: number, value: boolean) => {})
export const GetPedConfigFlag = vi.fn((ped: number, flag: number, arg: boolean) => false)

// Animations
export const RequestAnimDict = vi.fn((dict: string) => {})
export const HasAnimDictLoaded = vi.fn((dict: string) => true)
export const TaskPlayAnim = vi.fn((...args: any[]) => {})
export const ClearPedTasks = vi.fn((ped: number) => {})
export const ClearPedTasksImmediately = vi.fn((ped: number) => {})
export const IsEntityPlayingAnim = vi.fn(
  (entity: number, dict: string, name: string, flag: number) => false,
)

// Respawn
export const NetworkResurrectLocalPlayer = vi.fn((...args: any[]) => {})

// Controls
export const DisableControlAction = vi.fn(
  (padIndex: number, control: number, disable: boolean) => {},
)
export const IsControlPressed = vi.fn((padIndex: number, control: number) => false)
export const IsControlJustPressed = vi.fn((padIndex: number, control: number) => false)

// Aiming
export const GetEntityPlayerIsFreeAimingAt = vi.fn((playerId: number) => [false, 0])

// Resource file operations
export const LoadResourceFile = vi.fn((resourceName: string, fileName: string) => null)
export const SaveResourceFile = vi.fn(
  (resourceName: string, fileName: string, data: string, length: number) => true,
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
