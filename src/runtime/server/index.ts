import { GLOBAL_CONTAINER } from '../../kernel/di/container'

globalThis.oc_container = GLOBAL_CONTAINER

export { Server, createServerRuntime } from './server.runtime'
export type { ServerApi } from './server.runtime'
export type { ServerPluginApi } from './library/plugin/server-plugin-api'
export type { OpenCorePlugin, PluginInstallContext } from './library/plugin'
