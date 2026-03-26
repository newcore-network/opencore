type ValueOf<T> = T[keyof T]

const SYSTEM_EVENT_NAMESPACE = 'opencore'
const SYSTEM_CORE_EVENT_NAMESPACE = '_systemcore'

const systemEvent = (scope: string, action: string) =>
  `${SYSTEM_EVENT_NAMESPACE}:${scope}:${action}` as const

const systemCoreEvent = (action: string) => `${SYSTEM_CORE_EVENT_NAMESPACE}:${action}` as const

export type RemoteCommandExecuteEventName =
  `${typeof SYSTEM_EVENT_NAMESPACE}:command:execute:${string}`

export const buildRemoteCommandExecuteEventName = (
  resourceName: string,
): RemoteCommandExecuteEventName =>
  `${SYSTEM_EVENTS.command.execute}:${resourceName}` as RemoteCommandExecuteEventName

export const SYSTEM_EVENTS = {
  core: {
    ready: systemCoreEvent('ready'),
    requestReady: systemCoreEvent('request-ready'),
  },
  chat: {
    message: systemEvent('chat', 'message'),
    addMessage: systemEvent('chat', 'addMessage'),
    send: systemEvent('chat', 'send'),
    clear: systemEvent('chat', 'clear'),
  },
  command: {
    execute: systemEvent('command', 'execute'),
  },
  spawner: {
    spawn: systemEvent('spawner', 'spawn'),
    teleport: systemEvent('spawner', 'teleport'),
    respawn: systemEvent('spawner', 'respawn'),
  },
  appearance: {
    apply: systemEvent('appearance', 'apply'),
    reset: systemEvent('appearance', 'reset'),
  },
  vehicle: {
    create: systemEvent('vehicle', 'create'),
    createResult: systemEvent('vehicle', 'createResult'),
    delete: systemEvent('vehicle', 'delete'),
    deleteResult: systemEvent('vehicle', 'deleteResult'),
    repair: systemEvent('vehicle', 'repair'),
    repairResult: systemEvent('vehicle', 'repairResult'),
    repaired: systemEvent('vehicle', 'repaired'),
    setLocked: systemEvent('vehicle', 'setLocked'),
    getData: systemEvent('vehicle', 'getData'),
    dataResult: systemEvent('vehicle', 'dataResult'),
    getPlayerVehicles: systemEvent('vehicle', 'getPlayerVehicles'),
    playerVehiclesResult: systemEvent('vehicle', 'playerVehiclesResult'),
    created: systemEvent('vehicle', 'created'),
    deleted: systemEvent('vehicle', 'deleted'),
    modified: systemEvent('vehicle', 'modified'),
    warpInto: systemEvent('vehicle', 'warpInto'),
  },
  npc: {
    deleted: systemEvent('npc', 'deleted'),
  },
  session: {
    playerInit: systemEvent('player', 'sessionInit'),
    teleportTo: systemEvent('player', 'teleportTo'),
  },
} as const

export type SystemEventName = ValueOf<ValueOf<typeof SYSTEM_EVENTS>>
