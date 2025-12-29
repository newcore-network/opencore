import { initServer } from './bootstrap'
import {
  type FrameworkMode,
  resolveRuntimeOptions,
  type ServerInitOptions,
  type ServerRuntimeOptions,
} from './runtime'

export let _mode: FrameworkMode

export async function init(options: ServerInitOptions) {
  const resolved: ServerRuntimeOptions = resolveRuntimeOptions(options)
  _mode = resolved.mode
  await initServer(resolved)
}
